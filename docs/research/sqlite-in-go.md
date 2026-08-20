# Embedding SQLite in Go

Research for [#42](https://github.com/Eloquentia-Studios/blue-eyed/issues/42), a child of the architecture map [#37](https://github.com/Eloquentia-Studios/blue-eyed/issues/37). Investigated 2026-08-20 against sqlite.org, the driver repos and their issue trackers, sqlc's docs, and the migration tools' source.

Premises taken from the map and not reopened here: single container, embedded SQLite, zero external dependencies, Go backend, forward-auth in the request path of every protected service, horizontal scaling out of scope but not to be actively precluded.

## Answers in one place

| Question | Answer |
|---|---|
| Driver | `modernc.org/sqlite` |
| Static binary | Yes, `CGO_ENABLED=0`, `FROM scratch` |
| Concurrency | WAL, two pools (1 writer, N readers), `BEGIN IMMEDIATE` on every write |
| Session touch | Do not write on every check. Coalesce in memory, write on a staleness threshold |
| Query layer | sqlc, behind a hand-written repository interface |
| Migrations | goose, embedded, run at startup before the listener binds |
| Backup | `VACUUM INTO` via a `blue-eyed backup` CLI subcommand. No HTTP endpoint |
| Postgres door | Keep it open in the application, not in the SQL |

## Driver: modernc.org/sqlite

Take the pure-Go driver. The performance argument against it is four years out of date.

Current state, as of today:

| Driver | Latest | SQLite version | cgo |
|---|---|---|---|
| `mattn/go-sqlite3` | v1.14.50 (2026-08-17) | 3.53.4 | required |
| `modernc.org/sqlite` | v1.57.0 (2026-08-19) | 3.53.3 | no |
| `ncruces/go-sqlite3` | v0.35.3 (2026-08-03) | 3.53.4 | no (wasm) |
| `zombiezen.com/go/sqlite` | v1.4.2 (2025-05-23) | 3.49.2 | no |

Upstream SQLite is 3.53.4, released 2026-07-24 ([chronology](https://sqlite.org/chronology.html)). modernc is one patch release behind, roughly two months, and its generator repo `modernc.org/libsqlite3` already moved to 3.53.4 on 2026-08-03. zombiezen turns out to be a non-`database/sql` API layered on modernc, pinned about 20 modernc releases back. Not a candidate.

### Performance

Measured today on an i3-12100F, Go 1.26.5, WAL plus `synchronous=NORMAL`, single connection:

| | insert 200k | scan 200k | 50k point queries |
|---|---|---|---|
| mattn (cgo) | 309 ms | 99 ms | 132 ms |
| modernc | 428 ms (1.39x) | 134 ms (1.35x) | 177 ms (1.34x) |
| ncruces | 522 ms (1.69x) | 143 ms (1.44x) | 176 ms (1.33x) |

The widely cited [DataStation post](https://datastation.multiprocess.io/blog/2022-05-12-sqlite-in-go-with-and-without-cgo.html) from 2022 said modernc was twice as slow on inserts. That gap has closed to 30-40%. The independent [cvilsmeier/go-sqlite-bench](https://github.com/cvilsmeier/go-sqlite-bench) (last updated 2026-03-23) agrees on direction and adds two useful details: modernc actually beats mattn on concurrent reads, and loses badly on large blobs (1094 ms vs 376 ms, about 2.9x). blue-eyed stores sessions and users, not blobs.

The modernc maintainer publishes his own scorecard at [`modernc.org/sqlite-bench`](https://pkg.go.dev/modernc.org/sqlite-bench) across 16 platforms, and his driver loses 112 categories to 57. I find that more convincing than a benchmark where the author wins.

A 35% penalty on an operation measured in microseconds is not going to be the bottleneck in an auth gateway. Network round trips and password hashing dwarf it.

### Correctness

modernc runs SQLite's full TCL test suite, not the `veryquick` subset. The harness is `TestTclTest` in `modernc.org/libsqlite3`, invoking `test/all.test` over 1230 checked-in `.test` files. Its exclusion list is short and honest: `bigsort.test` on memory-constrained arches (it sets a 4 GiB page cache), three Windows-only skips, and three known failures, of which two are wall-clock timing assertions that never inspect query results.

The strongest maturity signal I found is that modernc found a data-corruption bug in stock upstream SQLite 3.53.3. A crash during an ATTACH transaction commit could zero the super-journal name; the checksum is a plain byte sum, so an all-zero name still validates, and `pager_playback()` then deletes the hot journal without replaying it. The modernc changelog documents that a plain gcc build of the stock amalgamation fails identically, so it was not a transpilation artifact. Reported to the [SQLite forum on 2026-07-20](https://sqlite.org/forum/info/2026-07-20T18:27:00Z), fixed upstream in 3.53.4.

Open issues on [gitlab.com/cznic/sqlite](https://gitlab.com/cznic/sqlite/-/issues): 29 open, 218 closed. No open wrong-results or corruption bugs. Historical ones exist ([#42](https://gitlab.com/cznic/sqlite/-/issues/42) in 2021 returned the same value for every column of every row under a TPC-H load) but all date to 2021 and were fixed.

One open issue matters if we ever target Windows: [#221](https://gitlab.com/cznic/sqlite/-/issues/221), open since 2025-09, crashes on WAL startup on Windows Server because SQLite 3.50.1 relies on Windows structured exception handling and modernc still compiles with `-DSQLITE_OMIT_SEH`. blue-eyed ships a Linux container, so this does not bite us. Worth remembering if that ever changes.

### Platform matrix

modernc generates per-platform source, so its support list is finite: darwin (amd64, arm64), freebsd (386, amd64, arm, arm64), linux (386, amd64, arm, arm64, loong64, ppc64le, riscv64, s390x), netbsd/amd64, openbsd (amd64, arm64), windows (386, amd64, arm64). Missing: illumos, solaris, dragonfly, android, ios, wasm, mips. An unsupported target does not degrade, it fails to build.

For a self-hosted homelab audience, linux/amd64 and linux/arm64 cover essentially everyone, including the Raspberry Pi crowd. Both are supported and CI-gated.

### What cgo actually costs

Measured, not assumed:

- Cross-compiling to linux/arm64 with `CGO_ENABLED=1` fails without a full per-target, per-libc toolchain. With `CGO_ENABLED=0`, modernc cross-compiles with a plain `GOARCH=arm64 go build`.
- mattn's default build is dynamically linked against glibc. It will not run on `FROM scratch`. Forcing static linking works but the linker warns that `dlopen` in a statically linked binary still needs matching glibc shared objects at runtime, which is the build-on-Debian, run-on-Alpine trap.
- mattn compiled with `CGO_ENABLED=0` builds cleanly and then panics at runtime: "Binary was compiled with 'CGO_ENABLED=0', go-sqlite3 requires cgo to work. This is a stub." A build error would be better than a production panic in the service that fronts everything.
- Cold build: mattn 32.6s, modernc 11.7s. Adding mattn's build tags for FTS5 and math functions pushes it to 45s.
- Per-cgo-call overhead measured at 25 ns on Go 1.26. The often-quoted 171 ns from Cockroach's 2015 post is stale; [Go 1.26](https://go.dev/doc/go1.26) alone cut cgo call overhead by about 30%. The scheduling cost matters more than the nanoseconds: a blocking cgo call pins an OS thread instead of parking a goroutine, and SQLite calls can block on fsync.
- Debugging. With modernc every stack frame is Go. A panic names `_sqlite3PagerGetExtra`. The race detector works inside the engine, and modernc's own tracker shows this paying off ([#252](https://gitlab.com/cznic/sqlite/-/issues/252), [#180](https://gitlab.com/cznic/sqlite/-/issues/180), [#173](https://gitlab.com/cznic/sqlite/-/issues/173) are all races the detector caught in engine internals). None of those would ever be found in a cgo build.

modernc's real cost is disk. Its module cache footprint is 151 MB for `sqlite` plus 95 MB for `libc`, about 250 MB, against 11 MB for mattn. On CI with a cold cache that is a real download every build. Worth knowing before the first CI bill.

### Feature comparison

I checked what each driver's default build actually supports rather than trusting docs, because the docs mislead here:

| | mattn (default) | modernc | ncruces |
|---|---|---|---|
| JSON / JSONB | yes | yes | yes |
| Math functions | no | yes | yes |
| FTS5 | no | yes | no |
| STAT4 | no | yes | yes |
| `VACUUM INTO` | yes | yes | yes |
| Window functions | yes | yes | yes |
| Online backup API | yes | yes | yes |
| Custom collations, UDFs | yes | yes | yes |
| Loadable C extensions | yes | never | never |

modernc ships the fattest default build of the three. FTS5, math functions, STAT4, preupdate hooks, SESSION, RBU and STAT4 are all on out of the box. mattn needs build tags for most of those, and each tag combination is a separate 45-second amalgamation compile.

modernc can never load a native `.so`. `Xdlopen` in `modernc.org/libc` returns 0 with "not supported" on Linux, and panics with a TODO on darwin. This is the one thing that would flip the decision, and only if we needed sqlite-vec, sqlean, or spatialite. blue-eyed does not. If full-text search over users ever comes up, modernc has FTS5 compiled in already.

ncruces deserves a mention. It has the cleanest issue tracker of the four (5 open issues, none of them bugs), the widest platform matrix, and the only working encryption-at-rest story via its Adiantum VFS. Its downsides for us: FTS5 and R*Tree became separate opt-in registrations in v0.35.0, a breaking change that means you cannot get FTS5 through a plain `sql.Open` DSN, and it requires Go 1.26. If modernc disappoints, ncruces is the fallback, not mattn.

### On mattn's maintenance

I expected to find it drifting and did not. Commits per month show about 18 months of near-dormancy through 2024 and 2025, then a sharp revival: 31 commits in April 2026, 63 in July. Fifteen releases since March. If a prior draft of this decision concluded "mattn is dying," that no longer holds.

What does hold: 105 open issues and 53 open PRs, some dating to 2014, and a bus factor of one (90 of 100 commits in the last year are the maintainer's). We are still not choosing it, but for the cgo reasons, not for neglect.

## Concurrency

### What WAL gives and does not give

From [sqlite.org/wal.html](https://sqlite.org/wal.html): "Writers merely append new content to the end of the WAL file. Because writers do nothing that would interfere with the actions of readers, writers and readers can run at the same time. However, since there is only one WAL file, there can only be one writer at a time."

So N readers concurrent with one writer. The single writer is a consequence of there being one append point in one file, not a tunable.

WAL also does not work over a network filesystem, because it needs shared memory between processes. Keep the database on a local volume. NFS-mounted Docker volumes are more common in homelabs than you would like.

### The trap that would actually bite us

Checkpoint starvation, [wal.html](https://sqlite.org/wal.html) section 6: "if a database has many concurrent overlapping readers and there is always at least one active reader, then no checkpoints will be able to complete and hence the WAL file will grow without bound."

That is exactly the shape of a forward-auth gateway. A continuous stream of overlapping short reads with no gaps means the WAL never resets. Automatic checkpoints are PASSIVE, so a blocked checkpoint gives up silently and nothing errors. The disk just fills.

This deserves a line in the ADR and probably a WAL-size metric.

### busy_timeout will not save a deferred transaction

This is the single most important correctness fact in this document.

`PRAGMA busy_timeout` installs a handler that sleeps and retries. It does not fire when retrying is provably futile. From [lang_transaction.html](https://sqlite.org/lang_transaction.html): "If a write statement occurs while a read transaction is active, then the read transaction is upgraded to a write transaction if possible. If some other database connection has already modified the database ... upgrading to a write transaction is not possible and the write statement will fail with SQLITE_BUSY."

The extended code is `SQLITE_BUSY_SNAPSHOT` (517). Your read snapshot is already stale. Waiting cannot make it fresh.

The fix is in [rescode.html](https://sqlite.org/rescode.html#busy): "To avoid encountering SQLITE_BUSY errors in the middle of a transaction, the application can use BEGIN IMMEDIATE instead of just BEGIN ... if it succeeds, then SQLite guarantees that no subsequent operations on the same database through the next COMMIT will return SQLITE_BUSY."

Bert Hubert reproduced this with two shells and a 10-second timeout, getting "database is locked" instantly ([writeup](https://berthub.eu/articles/posts/a-brief-post-on-sqlite3-database-locked-despite-timeout/)). He also warns against reaching for `BEGIN IMMEDIATE` everywhere, since it serializes all writes by definition.

Our session touch is read-then-write by nature. Look up the session, then update `last_seen`. That is precisely the deferred-upgrade shape. Either express it as one `UPDATE ... WHERE` statement, or wrap it in `BEGIN IMMEDIATE`. Never `sql.Tx` with default options and a SELECT first.

### The database/sql pool problem

`sql.DB` is a pool, and each pooled connection is a separate `sqlite3*` contending for the same write lock. Three consequences:

1. Under `SetMaxOpenConns(N>1)` the pool manufactures contention. Go queues goroutines at the pool, SQLite queues them again at the file lock, and the second queue reports failure as an error instead of blocking.
2. Most PRAGMAs are per-connection. A pool that quietly opens connection #7 under load gives you `busy_timeout=0` and `foreign_keys=off` unless every connection is configured at open time. Set them in the DSN or a connect hook, never once after `sql.Open`.
3. You do not control which connection a statement lands on, so anything connection-scoped becomes unpredictable.

The structure that works, and which David Crawshaw describes running in production ([notes](https://crawshaw.io/blog/one-process-programming-notes)): a read-only pool of N connections plus a single read-write connection in a pool of one.

Victor Skvortsov measured why in-process serialization beats letting SQLite arbitrate: a Go mutex around writes held 56k-66k ops/sec flat from 1 to 256 threads, while letting SQLite's POSIX advisory locks arbitrate collapsed at 128 threads and produced lock errors at 256 ([benchmarks](https://tenthousandmeters.com/blog/sqlite-concurrent-writes-and-database-is-locked-errors/)). `SetMaxOpenConns(1)` on a write pool is the same trick.

### PRAGMAs

| Pragma | Scope | Setting |
|---|---|---|
| `journal_mode=WAL` | persistent in the file | set once at startup |
| `busy_timeout` | per connection | 5000-10000 ms |
| `synchronous=NORMAL` | per connection | yes |
| `foreign_keys=ON` | per connection | yes, mandatory |
| `cache_size` | per connection | negative KiB, e.g. -32000 |
| `temp_store=MEMORY` | per connection | yes |
| `mmap_size` | per connection | leave at 0 |
| `wal_autocheckpoint` | per connection | leave at the 1000 default |

`journal_mode=WAL` is the only persistent one. Everything else must be reapplied on every connection the pool opens.

On `synchronous=NORMAL`, quoting [pragma.html](https://sqlite.org/pragma.html#pragma_synchronous) exactly: "WAL mode is safe from corruption with synchronous=NORMAL ... but WAL mode does lose durability. A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash. Transactions are durable across application crashes regardless of the synchronous setting."

For blue-eyed this is an easy yes. What is at risk is the last fraction of a second of `last_seen` bumps, and the cost of losing them is one re-login. Corruption is not on the table, the docs settle that.

On `mmap_size` I would leave it off, against the usual advice. From [mmap.html](https://sqlite.org/mmap.html): "An I/O error on a memory-mapped file cannot be caught and dealt with by SQLite. Instead, the I/O error causes a signal which, if not caught by the application, results in a program crash." An uncatchable SIGBUS taking down the auth gateway when the volume hits ENOSPC is worse than the syscalls we save on a database that already fits in cache.

Worth adding, not in the ticket: `PRAGMA optimize`. The [docs](https://sqlite.org/pragma.html#pragma_optimize) say applications with long-lived connections should run `PRAGMA optimize=0x10002` when a connection opens and plain `PRAGMA optimize` periodically. A gateway is exactly that case.

### The session-touch write load

Do not write on every check. That is the whole answer, and every auth system I looked at reached it independently.

NextAuth/Auth.js has `session.updateAge`, defaulting to 24 hours: "Throttle how frequently to write to database to extend a session." Django's `SESSION_SAVE_EVERY_REQUEST` defaults to `False`. The Copenhagen Book recommends extending expiry only past the halfway mark of the session lifetime. express-session deprecated its `resave: true` default and offers a separate lightweight `touch()`. oauth2-proxy defaults to stateless signed cookies and writes nothing per request.

Concretely, in priority order:

1. **Staleness threshold.** Only write `last_seen` if the stored value is older than N. At N=60s and 100 checks per minute per user, that is a 100x reduction for one minute of timestamp precision.
2. **Halfway sliding expiry.** Extend `expires_at` only past half the lifetime, and treat it as a separate cadence from `last_seen`.
3. **In-memory hot state.** Single process, so a mutex-guarded map is enough to decide "should I write" without touching disk. See the Postgres section for the constraint on this.
4. **Background coalescing writer.** One goroutine draining dirty session IDs and committing once a second. This also removes the write from the request critical path, which matters more than throughput when you are in front of every request.
5. **Single statement.** `UPDATE sessions SET last_seen=? WHERE id=? AND last_seen<?` as an implicit transaction. No deferred upgrade, staleness check in SQL.

Do 1 and 3 and the write rate stops being a function of request rate and becomes a function of active user count. For a household that is a handful of writes per minute.

For sizing: Skvortsov measured 103k single-row write transactions/sec at WAL plus `synchronous=NORMAL` on an M1, dropping to 72k at 1KB rows. A more modest Node.js setup on an i9 peaked around 16k writes/sec tuned. Even the pessimistic figure is orders of magnitude above what blue-eyed generates. If we ever approach it, the bug is that we are writing per request.

One caveat: both good benchmarks ran on laptops with local NVMe. I could not find a credible measured write benchmark on a small VPS with network-attached storage. Since `synchronous=NORMAL` defers fsync to checkpoint time, slow storage turns checkpoints into latency spikes rather than slowing steady-state writes.

## Query layer: sqlc

sqlc's SQLite support is still marked Beta in the [language support matrix](https://docs.sqlc.dev/en/latest/reference/language-support.html), and has been since it landed. Postgres and MySQL are Stable. Latest release is v1.31.1 (2026-04-22); v1.31.0 added a SQLite database analyzer built on `ncruces/go-sqlite3`, and v1.31.1 immediately downgraded that dependency, which tells you how fresh it is. The tracking issue [#2903](https://github.com/sqlc-dev/sqlc/issues/2903) is still open.

There are 64 open issues carrying the sqlite label. The pattern across them is consistent: plain CRUD and simple joins work, and anything more exotic hits a parser edge. Type inference has holes ([#3119](https://github.com/sqlc-dev/sqlc/issues/3119) integer PKs inferred nullable, [#3688](https://github.com/sqlc-dev/sqlc/issues/3688) CAST yields the wrong Go type). `UPDATE ... FROM` is unsupported ([#3132](https://github.com/sqlc-dev/sqlc/issues/3132), open since Jan 2024). CTEs are shaky ([#3730](https://github.com/sqlc-dev/sqlc/issues/3730), [#3996](https://github.com/sqlc-dev/sqlc/issues/3996)). `RETURNING` works but breaks with ORDER BY or LIMIT ([#3600](https://github.com/sqlc-dev/sqlc/issues/3600), [#4066](https://github.com/sqlc-dev/sqlc/issues/4066)).

Two to avoid outright. `sqlc.slice` desynchronizes parameter numbering on SQLite when a slice appears before other parameters ([#2452](https://github.com/sqlc-dev/sqlc/issues/2452), open since July 2023). And there is no `:copyfrom` for SQLite ([#3305](https://github.com/sqlc-dev/sqlc/issues/3305)), so bulk insert is a loop.

None of that is fatal for a users/sessions/clients/grants schema. The failure mode is right: you find out at generate time, not at 3am. And the escape hatch is free, because sqlc's SQLite output is plain `database/sql`. If a query will not parse, hand-write that one.

**sqlc does not care which driver you use.** Generated SQLite code targets a `DBTX` interface built from stdlib types. `sql_package` accepts only `pgx/v4`, `pgx/v5`, or `database/sql`, and the pgx options are Postgres-only. `sql_driver` lists no SQLite driver at all. Swapping between modernc, ncruces, and mattn is a one-line import change, not a regeneration. The official [SQLite tutorial](https://docs.sqlc.dev/en/latest/tutorials/getting-started-sqlite.html) uses `modernc.org/sqlite`, and sqlc itself moved off mattn to modernc internally in v1.25.0 to drop cgo.

**Portability between engines is poor, and sqlc is not where you fix it.** Each `sql:` entry pins exactly one engine, one schema, one output package. There is no dual-engine generation mode. The maintainers rejected shared models across engines in [#1941](https://github.com/sqlc-dev/sqlc/issues/1941), recommending you define your own structs and convert. So the real-world pattern is one query directory and one generated package per engine, plus a hand-written interface in front.

Alternatives, briefly. sqlx is genuinely driver-agnostic and would make a port cheap, but its last push was 2024-08-15 and it gives no compile-time checking, which is the thing sqlc buys. bun and jet are actively maintained but take SQL away and replace it with a Go DSL. ent and gorm are much bigger commitments and hide the generated SQL, which I do not want in the service that fronts everything. squirrel solves dynamic composition, not mapping, and is a complement rather than a replacement.

Take sqlc.

## Migrations: goose

Not close, on the evidence.

| | [pressly/goose](https://github.com/pressly/goose) | [golang-migrate/migrate](https://github.com/golang-migrate/migrate) |
|---|---|---|
| Latest release | v3.27.3, 2026-07-22 | v4.19.1, 2025-11-29 |
| Commits, last 12 months | 60 | 28 |
| Open issues | 93 | 310 |

golang-migrate's 28 commits are mostly dependabot bumps. Its README says the API is "stable and frozen," which is a position rather than neglect, but it means nothing improves.

Four things decide it:

**goose is cgo-free for SQLite already.** Its `go.mod` lists `modernc.org/sqlite v1.54.0` directly, and `cmd/goose/driver_sqlite3.go` is a blank import of it. The dialect is named `sqlite3` but there is no cgo. As a library you bring your own `*sql.DB` anyway, so the driver is entirely our choice.

**goose supports Go-code migrations.** `goose.AddMigration(up, down)` with `func(tx *sql.Tx) error`. golang-migrate has no equivalent; migrations are SQL files only. For an OIDC provider that will eventually need to rehash a password format or re-encode stored tokens, that matters.

**golang-migrate's dirty flag would strand the container.** From its [FAQ](https://github.com/golang-migrate/migrate/blob/master/FAQ.md): "Execution stops if a migration fails and the dirty state persists ... You need to manually fix the error and then 'force' the expected version." In a container that fronts every other service, a dirty flag means it will not come up and someone is hand-editing a table at whatever hour the deploy happened. Since SQLite DDL is transactional and both tools wrap migrations, a failed migration already rolled back cleanly. The flag is pure friction here.

**The version table is an audit log rather than a single row.** goose writes one row per apply event to `goose_db_version`. golang-migrate stores a single current version plus the dirty bit, with no history.

Embedding is a wash. Both support `embed.FS`, goose via `goose.SetBaseFS(embedMigrations)` and golang-migrate via its `iofs` source driver. goose's is one call less ceremony.

Neither locks the SQLite database, and neither needs to. golang-migrate's SQLite `Lock()` is an in-process atomic bool that offers zero cross-process protection; goose's `lock/` package only has Postgres and MySQL implementations. One container, so it does not matter. On a Postgres port we would want `goose.WithSessionLocker`.

Also checked and rejected: **atlas** is genuinely good and its [rollback writeup](https://atlasgo.io/blog/2024/11/14/the-hard-truth-about-gitops-and-db-rollbacks) is the best writing I found on the subject, but `atlasexec` wraps the Atlas CLI binary rather than being a Go library, so we would ship a second binary in the container. That defeats the point. Most of the interesting features are also behind a $9/seat/month Pro tier. **tern** is Postgres-only. **dbmate** (v2.35.0, 2026-08-07, only 47 open issues) is a credible fallback if goose ever disappoints, with a nice `schema.sql` dump for reviewing schema diffs in git, but no Go-code migrations.

### What SQLite DDL forces on migration design

[ALTER TABLE](https://sqlite.org/lang_altertable.html) can do four things: rename a table, rename a column, add a column, drop a column. Nothing else. No changing a type, no adding or removing a constraint, no toggling NOT NULL.

Two restrictions that will come up:

- Adding a column with `DEFAULT CURRENT_TIMESTAMP` is forbidden. You add it nullable and backfill, or rebuild the table.
- `DROP COLUMN` fails if the column is indexed. That one is easy to miss.

Anything else needs the [12-step table rebuild](https://sqlite.org/lang_altertable.html): disable foreign keys, begin, record existing indexes/triggers/views, create `new_X`, copy, drop `X`, rename, recreate, `PRAGMA foreign_key_check`, commit, re-enable foreign keys.

**Step 1 is a trap with both migration tools.** `PRAGMA foreign_keys` is "a no-op within a transaction" ([docs](https://sqlite.org/pragma.html#pragma_foreign_keys)), and goose wraps every migration file in a transaction by default. So `PRAGMA foreign_keys=OFF` at the top of a migration file does nothing, and the `DROP TABLE` in step 6 cascades. Any table rebuild must either use `-- +goose NO TRANSACTION` and manage `BEGIN`/`COMMIT` itself, or toggle the pragma in Go code around the migration call. The latter is cleaner and is another argument for goose's Go migrations.

Is SQLite DDL transactional? Yes, though I could not find a sentence on sqlite.org saying so in those words. The proof is that SQLite's own 12-step procedure puts `CREATE TABLE`, `INSERT`, `DROP TABLE`, `ALTER TABLE RENAME`, and `CREATE INDEX` between a BEGIN and a COMMIT and presents it as the recommended approach. golang-migrate's SQLite driver README states it outright as its reason for wrapping. This is a real advantage SQLite shares with Postgres and MySQL lacks.

Set `journal_mode=WAL` in Go at startup, never in a migration file. It cannot change while a transaction is active, and it is persistent anyway.

### Running migrations in the container that fronts everything

Migrate on startup, in-process, before the listener binds. Ship a `blue-eyed migrate` subcommand as an escape hatch. Refuse to start if the database is ahead of the binary.

The usual objection to startup migration is that N replicas race. We have one instance, so there is no race, and an init container would be machinery for a coordination problem we do not have. The same binary that serves also migrates, so there is no drift between a migration image and an app image.

The version check is worth the ten lines. Database ahead of binary means someone rolled the image back after a schema change, and old code writing to a newer schema is the failure that corrupts data quietly. Compare embedded migrations against `goose_db_version` and refuse to serve. Behind is normal and gets fixed by migrating.

**Treat migrations as forward-only.** Atlas's [rollback post](https://atlasgo.io/blog/2024/11/14/the-hard-truth-about-gitops-and-db-rollbacks) names the reason down migrations do not work in practice, and the third one is decisive: "when we pull artifacts from a previous version, they do not contain the down files that are needed to revert the database changes back to the necessary schema, they were only created in a future commit." You cannot roll back with an artifact that predates the change. Write `-- +goose Down` blocks for local development, but do not build recovery on them.

The actual rollback mechanism is a backup taken immediately before migrating. On startup, if there are pending migrations, run `VACUUM INTO 'blue-eyed.db.pre-<version>.bak'` and then migrate. Recovery becomes stop, move the file back, redeploy the old image. Minutes, and tested.

**On downtime.** With one container there is never a moment when two code versions run against one database, so we do not need expand/contract. A column rename can be one migration and one deploy. That is a real benefit of this architecture and we should take it.

The uncomfortable part: during that window every service behind Traefik is down too, not just blue-eyed. That raises the bar on testing migrations against a copy of real data, and it argues for keeping the biggest table small. A sessions or tokens table that grows unbounded is what turns a 200 ms migration into a 30-second outage across the whole stack. Prune it.

## Backup

`cp` of a live WAL database is unsafe, two ways. [howtocorrupt.html](https://sqlite.org/howtocorrupt.html) section 1.2: a backup taken mid-transaction "might contain some old and some new content, and thus be corrupt." And [wal.html](https://sqlite.org/wal.html) section 4: "If a database file is separated from its WAL file, then transactions that were previously committed to the database might be lost, or the database file might become corrupted." Under the default 1000-page autocheckpoint that is up to about 4 MB of recent writes silently dropped.

**Use `VACUUM INTO`.** From [lang_vacuum.html](https://sqlite.org/lang_vacuum.html): "an alternative to the backup API for generating backup copies of a live database ... The VACUUM INTO command is transactional in the sense that the generated output database is a consistent snapshot of the original database."

It is one SQL statement on an ordinary connection. No raw conn extraction, no C API, no write lock (it is a reader). The output is compacted and has no forensic traces of deleted rows, which is a small bonus for a database full of session tokens. And because we run `synchronous=NORMAL`, SQLite fsyncs the output, which the docs call out specifically.

Two constraints: the destination must not already exist, and you cannot run it from a connection that has an open transaction.

**What the application must do: ship a CLI subcommand, and no HTTP endpoint.**

`blue-eyed backup <path>` is about forty lines and beats telling operators to `docker exec ... sqlite3`, because with modernc there is no `sqlite3` binary in a scratch image. Our binary is definitely there. The subcommand also owns the details: refuse to overwrite, set `busy_timeout` first, fsync the directory, return a real exit code.

An HTTP backup endpoint is a bad idea in this specific service. It would stream the whole session table, tokens included, to anyone who reaches it. That is a full authentication bypass. `docker exec` is already the operator's authenticated channel and gives us authorization for free.

**The ADR should say out loud what this does not give us.** The backup lands on the same volume, so it does not survive volume loss. Something external still has to move it off the box. `VACUUM INTO` makes a correct backup, not an offsite one, and those are separate decisions.

Alternatives considered:

- **`sqlite3_rsync`**, shipped with SQLite since 3.47.0 (2024-10-21). Both databases may be live, and the replica ends up "a fully-consistent snapshot of ORIGIN at an instant in time" ([docs](https://sqlite.org/rsync.html)). Bandwidth-efficient, good for incremental off-box copies, but needs the binary on both ends.
- **Litestream** (v0.5.16, 2026-08-05, actively maintained) streams to object storage with point-in-time recovery. Understand what it does to WAL behavior first: it "starts a long-running read transaction to prevent any other process from checkpointing" and takes over checkpointing itself ([how it works](https://litestream.io/how-it-works/)). It deliberately induces the checkpoint starvation described above. It also requires `busy_timeout=5000` and, under high write load, `wal_autocheckpoint=0`. Right answer if the recovery objective tightens below "last night's snapshot." Bigger hammer than "the operator can grab a copy."
- **LiteFS**: no. Last release v0.5.14 from 2025-04-22, 16 months ago, LiteFS Cloud sunset in 2024, and Fly's own docs say "We are not able to provide support or guidance for this product." It solves multi-node replication, which we do not have, in exchange for putting FUSE in the path of our auth database.
- **Volume snapshots** are plausible if the snapshot is genuinely atomic across `.db`, `-wal`, and `-shm`, in which case the restore looks like a power cut, which SQLite recovers from. Docker named volumes on overlayfs give no such guarantee. I could not find a sqlite.org statement either way on this, so treat it as reasoning rather than a citation.

## Keeping the Postgres door open

The map calls this cheap to leave open and expensive to retrofit. That is right, and the leverage is almost entirely in the application, not in the SQL.

### The one thing that matters most

**Put a hand-written repository interface between the domain and sqlc's generated code.** Define `type SessionStore interface { ... }` in the domain package and let the SQLite implementation be the only implementation today. A Postgres port then becomes a second implementation rather than a rewrite. This costs close to nothing now, and it is the single highest-leverage move available, because sqlc itself cannot be made portable (see the query layer section).

### Second: use STRICT tables

[STRICT tables](https://sqlite.org/stricttables.html), available since 3.37.0, require a declared type from INT, INTEGER, REAL, TEXT, BLOB, ANY, and reject values that cannot be losslessly converted. Add `STRICT` to every `CREATE TABLE`.

Without it, SQLite's dynamic typing lets three different code paths write `1`, `"1"`, and `true` into the same column, and you discover it on port day when Postgres rejects two of them. STRICT also fixes SQLite's own acknowledged bug where PRIMARY KEY columns may be NULL. It is one keyword.

The limit is that six type names is not many. No BOOLEAN, no TIMESTAMP, no UUID. Semantics live in the Go types. That means our SQLite `schema.sql` will not be a starting point for Postgres DDL, and we should expect to write that fresh.

### Things to avoid in the SQL

- **`INSERT OR REPLACE` and `INSERT OR IGNORE`.** Postgres has no equivalent syntax at all. Worse, REPLACE is a delete plus an insert ([lang_conflict.html](https://sqlite.org/lang_conflict.html)): unmentioned columns reset to defaults, the row gets a new rowid, and `ON DELETE CASCADE` on child tables can fire depending on `PRAGMA recursive_triggers`. An `INSERT OR REPLACE INTO users` could silently delete every session for that user. Use `ON CONFLICT (col) DO UPDATE` with exactly one clause and an explicit target, which SQLite deliberately modeled on Postgres.
- **`last_insert_rowid()`.** Connection-scoped and SQLite-only. Use `INSERT ... RETURNING id`, supported by both.
- **`AUTOINCREMENT`.** SQLite's own docs say it "should be avoided if not strictly needed." Better still, generate IDs in Go (UUIDv7 or ULID). You get the ID before the insert, it survives an engine swap unchanged, and sequential user IDs stop being an enumeration oracle for an OIDC provider.
- **`DEFAULT CURRENT_TIMESTAMP`.** SQLite returns second-resolution UTC text with no timezone marker. Postgres returns a microsecond `timestamptz`. Second resolution is genuinely too coarse for token issued-at and nonce windows, and ties in `created_at` ordering become common. Generate timestamps in Go as RFC-3339 UTC.
- **`strftime` and friends.** No overlap with Postgres date functions. Do date arithmetic in Go. Plain comparison (`WHERE expires_at > ?`) is portable if the stored format sorts lexically, which RFC-3339 UTC does.
- **`LIMIT` in UPDATE/DELETE.** Requires a SQLite compile-time option (I did not verify whether modernc enables it) and does not exist in Postgres at all. Use the CTE-plus-self-join form, which works on both. This will come up when pruning expired sessions.
- **Double-quoted string literals.** SQLite silently treats `"alice"` as a string when it matches no identifier. Postgres reads it as a column name. Single quotes for literals, always.
- **Comma joins.** SQLite gives all join operators equal precedence, which differs from the standard. Explicit `JOIN` only.

### The collation bug worth naming

This one is close to a security bug, and it lines up with closed issue #20 about username capitalization.

SQLite's `NOCASE` folds only the 26 ASCII letters and does not attempt full Unicode case folding. And `LIKE` is case-insensitive for ASCII by default ([lang_expr.html](https://sqlite.org/lang_expr.html) gives `'a' LIKE 'A'` as TRUE and `'æ' LIKE 'Æ'` as FALSE). Postgres inverts this: `LIKE` is case-sensitive, and you need `ILIKE`, a Postgres extension.

So `SELECT * FROM users WHERE email LIKE ?` finds `alice@example.com` when the user types `Alice@example.com` on SQLite, and silently stops matching on Postgres. A registration flow that checks for duplicates that way would start permitting a second account at the same address after an engine swap, with no code change.

**Normalize identifiers in Go.** Lowercase and NFC-normalize emails and usernames in the application, store the normalized form in its own column, compare with plain `=` under BINARY collation. Both engines then agree, the comparison is index-friendly on both, and the policy is testable Go code instead of an emergent property of a collation setting. Never use `LIKE` or `COLLATE NOCASE` for identity lookups.

### What to avoid in the application, which is the part that fails silently

Everything above fails loudly at port time. This section fails quietly, in production, under load, in an auth system.

SQLite serializes write transactions against the whole database. Postgres defaults to Read Committed, where "two successive SELECT commands can see different data" within one transaction ([transaction-iso.html](https://www.postgresql.org/docs/current/transaction-iso.html)). SQLite does not give textbook SERIALIZABLE, but for lost updates from concurrent read-modify-write it has the same effect: the interleaving simply cannot happen. SQLite hides the bug. Postgres exposes it.

- **Do not use a Go mutex where you mean a database constraint.** `mu.Lock()` around a read-then-write expresses a database concurrency rule in process memory, and it evaporates the moment there are two processes. Express it in the schema instead: a UNIQUE constraint, `ON CONFLICT DO NOTHING`, or a conditional `UPDATE ... WHERE version = ?` checked by rows-affected.

  The auth-specific cases: authorization code redemption, refresh token rotation with reuse detection, PKCE and nonce consumption. All of them are "exactly once" problems. Write each as `UPDATE codes SET used_at=? WHERE code=? AND used_at IS NULL` and check rows-affected. Correct on both engines, no lock. Writing it as SELECT, check in Go, then UPDATE is correct on SQLite and a double-redemption vulnerability on Postgres.

- **Do not treat an in-memory cache as authoritative.** A session map read on every forward-auth check is correct with one process and stale with two, and a logout on instance A leaves the session live on instance B. In a forward-auth service that is a revocation bypass. Caches must be read-through with the database as truth, and TTL-bounded. The test for every cache: if a second process held a different value here, would we be insecure or merely slow? Only "slow" is acceptable.

  This constrains the in-memory session-touch optimization above. The memory holds `last_seen`, which is telemetry. It must not hold whether the session is valid.

- **Do not hold security-relevant state in Go maps.** Rate-limit counters, failed-login backoff, nonce replay caches, CSRF state. Each one silently weakens with a second process: a limit of 5 attempts becomes 5N, and a replay cache stops catching replays that land on the other instance. `INSERT ... ON CONFLICT (key, window) DO UPDATE SET count = count + 1 RETURNING count` is portable, atomic on both engines, and correct at any process count.

- **Do not write background jobs that assume exactly one instance.** Session pruning, token expiry sweeps, key rotation, JWKS regeneration. A bare `time.Ticker` is exactly-once today and N-times-concurrently later. Two instances rotating signing keys at once is genuinely bad for an OIDC provider: tokens signed by a key the other instance already retired. Make every periodic job idempotent and safe to run concurrently, with its effect expressed as a conditional write. Idempotence costs nothing today.

- **Do not rely on read-your-own-write across connections.** Automatic with one process and one file. Under a Postgres pool, a write on connection 1 followed by a read on connection 2 can miss it. Keep dependent reads in the same transaction, or use `INSERT ... RETURNING` so there is no follow-up read.

- **Keep write transactions short.** Today nothing competes for the write lock, which quietly encourages long transactions. That habit produces lock contention on Postgres. Compute before BEGIN, not inside it.

## Open questions and gaps

- No live CI dashboard for modernc's TCL results. The checked-in test logs are years stale (the darwin one is SQLite 3.33-era). The evidence is the harness source, its exclusion lists, and changelog assertions.
- No independent third-party driver benchmark newer than 2026-03-23. The August 2026 numbers are the modernc maintainer's own scorecard plus measurements taken during this research.
- No credible measured write benchmark on a small VPS with network-attached storage. Both good sources ran on laptops with NVMe.
- Whether `modernc.org/sqlite` compiles with `SQLITE_ENABLE_UPDATE_DELETE_LIMIT` is unverified. Avoiding `LIMIT` in UPDATE/DELETE makes it moot.
- No sqlite.org statement either way on filesystem or volume snapshots as a backup method.
- sqlc SQLite window function support has no open issue against it, but also no positive statement in the docs. Absence of evidence.
