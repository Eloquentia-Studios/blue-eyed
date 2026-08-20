# Which Go library for the OIDC Provider?

Research for issue #39, part of map #37. Investigated 2026-08-20. All version and
activity claims were checked against the Go module proxy, the GitHub API, and the
OpenID Foundation certification listings on that date.

## Recommendation

Use `github.com/zitadel/oidc/v3` (`pkg/op`).

The trade-off, stated plainly: zitadel/oidc is the least exciting candidate and the
one least likely to leave us holding the bag. We pay for that with roughly a thousand
lines of storage adapter, and we write signing-key rotation, refresh-token reuse
detection, and expiry sweeping ourselves, because the library does none of the three.
A better-designed library exists (`luikyv/go-oidc`, see below) and it wins on almost
every technical axis, but 519 of its ~550 commits are one person's. Choosing it means
accepting that a two-person team may end up maintaining an OIDC protocol
implementation. That is the whole decision.

The runner-up is close enough that #50 should reject it deliberately rather than by
omission.

## The candidates, and what happened to them

### ory/fosite is out, and not for the reason you would expect

fosite is not merely stale. It is unreachable.

The last release is v0.49.0, 2024-12-12 (`proxy.golang.org/github.com/ory/fosite/@latest`).
The last commit on `master` is 2025-07-03. Zero commits in the thirteen months since.

On 2025-10-31 Ory merged fosite into the Hydra monorepo. `ory/hydra` now contains a
top-level `fosite/` directory, `ory/hydra`'s `go.mod` no longer requires
`github.com/ory/fosite` at all, and development continues at
`github.com/ory/hydra/v2/fosite`. The two trees have diverged by 198 files.

That maintained copy cannot be imported. Hydra's `go.mod` declares
`module github.com/ory/hydra/v2` while its tags moved to CalVer (v26.2.0), so Go
resolves `@latest` to v2.3.0 from January 2025, which predates the merge and does not
contain `fosite/`. Hydra also carries `replace github.com/ory/x => ./oryx`, which
downstream modules ignore, leaving an unresolvable placeholder version. A build probe
confirmed both failures:

```
go: github.com/ory/hydra/v2/fosite imports
    github.com/ory/x/errorsx: github.com/ory/x@v0.0.0-00010101000000-000000000000:
    invalid version: unknown revision 000000000000
```

So the only importable fosite is a December 2024 snapshot, on a branch with no commits
since July 2025, carrying three unanswered 2026 security reports (#882 unbounded
`strings.Split` DoS, #875/#876 `alg=none` accepted in request objects), still pinned to
go-jose v3, and missing device flow entirely (that landed on master after the release).
No archive notice, no deprecation notice, nothing on the README. You have to build
against it to find out.

Two things also worth knowing even though they no longer matter for the decision.
fosite is an OAuth2 framework, not an OP: discovery, JWKS, key rotation, userinfo,
`end_session`, and client registration are all absent, and live in Hydra. And a minimal
program using `compose.ComposeAllEnabled` plus the in-memory store compiles to a 24 MB
binary linking 53 modules, among them gRPC, Zipkin, thirteen OpenTelemetry modules, and
a full ORM, all pulled in through `github.com/ory/x`.

### ory/hydra is the wrong shape

Hydra is a second daemon with its own config, ports, and database. It also has no user
database by design and delegates login to an app you write, so adopting it means
running two services and implementing Hydra's login/consent protocol on top of the auth
logic that blue-eyed already is.

SQLite is more supported than I expected. `DSN=sqlite://` works, the persister has
real `case "sqlite3":` branches, and official releases ship `-sqlite` build variants.
But Ory's own docs say SQLite "must not be used in a production deployment," and the
SQLite builds need cgo. Shipping on a configuration the vendor tells you not to ship on
is a standing liability with no recourse.

### authelia.com/provider/oauth2 is the healthiest fosite lineage

Authelia hard-forked fosite and actually maintains it: v0.2.40 on 2026-08-01, 278
commits in the last twelve months, three JOSE hardening commits on 2026-08-20 itself.
Apache-2.0. It adds what upstream never had, including RFC 7591 dynamic registration,
DPoP, mTLS, and about fifteen named upstream bug fixes. Authelia 4.39 is certified
Basic, Implicit, Hybrid, Config, and FormPost OP as of 2025-05-13 using it.

I did not shortlist it. The README opens by calling it an internally used library,
pkg.go.dev reports zero external importers, it has 8 stars, the API is v0.2.x with a
rename still planned, and the bus factor is one person (James Elliott). It carries all
of fosite's structural gaps too: no `end_session` and no discovery generation in the
library, both of which Authelia writes app-side. We would inherit the fat fosite
storage interface with none of the community that usually justifies it.

### luikyv/go-oidc is the one that got away

This is the only Go library in the survey designed as an OP from the start rather than
extracted from a product, and it is the strongest technical fit for blue-eyed's
constraints.

- v0.25.0, 2026-07-23. Steady releases, v0.20 through v0.25 between May and July 2026.
- MIT.
- Three dependencies: `go-jose/v4`, `go-cmp`, `uuid`. Nothing else. No router, no
  OpenTelemetry.
- Certified. The OpenID Foundation lists "Luiky Vasconcelos, go-oidc >= 0.11.0" with
  five OP profiles dated 10 and 11 August 2025. This is a certification of the library
  itself, listed under the author's name, not of some product built on it. As far as
  I can tell it is the only Go OP library that can say that.
- Ships in-library what everything else makes you write: discovery, JWKS, userinfo,
  introspection, revocation, RP-initiated logout (`internal/logout/`), dynamic client
  registration (`internal/dcr/`), PAR, JAR, JARM, DPoP, mTLS, form-post.
- The storage model is the good part. Instead of one god-interface it splits into small
  optional interfaces in `pkg/goidc/model.go`, each two to five methods, all
  context-first, all documented to return `ErrNotFound`: `GrantManager`, `AuthManager`,
  `PARManager`, `DCRManager`, `RefreshTokenManager`, `CIBAManager`, `DeviceAuthManager`,
  `OpaqueTokenManager`, `OpenIDFedManager`. For code plus PKCE plus refresh, you
  implement `GrantManager`, `AuthManager`, and `RefreshTokenManager`. Call it eight
  methods against SQLite.

Against that: 111 stars, 5 open issues, and `luikyv` has 519 of about 550 commits. The
next two contributors are dependabot (21) and one human with 6. The API is pre-1.0.

I want to be clear that I am not dismissing this on stars. Eight storage methods versus
zitadel's twenty-three, plus a current OP certification, is a real advantage on exactly
the axis #39 calls irreversible. What tips it is that the failure mode is asymmetric.
If zitadel/oidc stalls, blue-eyed keeps running and someone else finds the CVE. If
luikyv stops, blue-eyed's two people become the CVE response team for an OIDC provider.

### Dead or wrong side of the protocol

- `go-oauth2/oauth2` v4.5.4 (2025-08-20), one commit in twelve months. Zero hits for
  `id_token`, `openid`, or `jwks` anywhere in the repo. It is OAuth2 only.
- `openshift/osin`: last real commit 2022-03. `RangelReale/osin`: archived 2018.
- `coreos/go-oidc/v3` is client-side. The repo description says so.
- `dexidp/dex` is alive and irrelevant. It is a federation broker, every connector is
  upstream federation or LDAP, there is no WebAuthn connector, and its SQLite path uses
  cgo through `mattn/go-sqlite3`. blue-eyed explicitly wants no upstream federation.
- A sweep of GitHub for Go OIDC provider repos updated in 2024 through 2026 turned up
  mock servers, Kubernetes federation adapters, and sub-ten-star hobby projects.
  Nothing new has displaced the incumbents.

## zitadel/oidc in detail

### Health

v3.49.2, released 2026-08-07. 1,869 stars, 215 forks, 30 open issues, 13 open PRs, last
push 2026-08-18. Apache-2.0, with permissive dependencies throughout and no copyleft.

A v4 line exists as a prerelease. The `next` branch declares
`module github.com/zitadel/oidc/v4` and four prereleases have shipped, v4.0.0-next.1
(2026-01-07) through next.4 (2026-07-30). The only announced breaking change so far is
small, `expires_in` moving from `int64` to `oidc.Duration`. No date attached. Nothing to
plan around, but worth watching before we pin.

The durability argument is concrete rather than a star count. ZITADEL the product ships
against this library: `zitadel/zitadel`'s `go.mod` requires
`github.com/zitadel/oidc/v3 v3.47.5`. A funded company's commercial product breaks if
this library breaks.

Now the honest half. Of roughly 92 commits in the last twelve months, 56 are dependabot.
Human commits are two maintainers plus one-offs. The maintainers say why, in
discussion #785 from 2025-08-19, linked from the README:

> Due to growth of our company, we are currently struggling allocating time for reviews
> of feature pull requests. Fixes and security updates still get our attention
> regularly.

Two substantial feature PRs have sat unreviewed for over a year: #782 (dynamic client
registration) and #768 (PAR). Individual issue replies are blunter, for example on #704:
"At Zitadel we do not use this implementation, so its unlikely any staff will work on
[it]." Budget zero upstream responsiveness for features. Security fixes and dependency
bumps do land.

For blue-eyed that is close to what we want. We need a protocol layer that stops
changing, not one that grows.

### OP feature coverage

Supported: authorization code with PKCE, and only S256 is ever advertised
(`pkg/op/discovery.go` appends S256 and nothing else, so `plain` is never offered).
Discovery. JWKS. Userinfo. RP-initiated logout, fully implemented in `pkg/op/session.go`
including `id_token_hint`, `post_logout_redirect_uri` validation, `state` passthrough,
and a `CanTerminateSessionFromRequest` hook that can redirect to our own logout-confirm
page. Introspection (RFC 7662). Revocation (RFC 7009). Device flow, client credentials,
JWT profile, `private_key_jwt`, and token exchange, all opt-in through optional
interfaces the library type-asserts for.

Absent: dynamic client registration (PR #782, unreviewed since 2025-08-10), PAR (PR
#768), mTLS-bound tokens, front-channel logout, hybrid flow, HS256 signing.

Half-done, and worth flagging because the README overstates it. Back-channel logout is
listed as supported for the OP. What exists is `oidc.NewLogoutTokenClaims(...)` and two
discovery booleans. There is no `backchannel_logout_uri` on `op.Client`, no sender, no
retry, no per-session RP tracking. Turn the discovery flag on and you have promised
something you have not built.

Also half-done: `ResponseTypes()` in `discovery.go` is hardcoded to `code`, `id_token`,
`id_token token` with a `// TODO: ok for now` comment, so we cannot narrow the
advertised response types to code-only through config (issue #924, open since
2026-07-20).

None of the absent items are load-bearing for blue-eyed. Grafana, Gitea, and Nextcloud
all use static registration and need code plus PKCE, refresh, userinfo, and logout. That
is exactly the covered set.

### Certification, stated precisely

zitadel/oidc is certified as a relying party, not as a provider.

The OpenID Foundation's certified implementations list has one zitadel entry under RP
libraries: OIDC v0.15.7, certified by CAOS, profiles Basic RP and Config RP. That is a
library certification, for the client side, pinned to a version from long before v3.

The OP certification belongs to the product. The certified providers table has exactly
one row: CAOS, ZITADEL 1.53.1, Basic OP, 04-Nov-2021. I pulled the raw HTML and read the
row directly, because the page's JavaScript defeats normal fetching. One profile, one
product, nearly five years ago.

The maintainers agree. Issue #427, open since 2023, says "The last test was for the
complete zitadel product, v1.53.1 in November 2021," and still has "What is our current
level of compliance?" as an unchecked box. The README's own goals list has an unchecked
"Certify this library as OP."

So blue-eyed cannot claim to be built on a certified OP library. We can say the same
codebase underpins ZITADEL, whose product was Basic OP certified in 2021. If
certification ever matters to us, we certify blue-eyed itself, which is what Pocket ID,
Tinyauth, and Authelia each did.

### Storage interface, and how it sits on SQLite

`op.Storage` is `AuthStorage` (14 methods) plus `OPStorage` (8) plus `Health` (1). On
top of that, `op.Client` is 16 getters and `op.AuthRequest` is 15. Optional interfaces
add two to four methods each for client credentials, device flow, token exchange, and
the modern request-aware claim hooks (`CanSetUserinfoFromRequest`,
`CanGetPrivateClaimsFromRequest`).

The good news is substantial and it is the main reason I am comfortable with this
choice. Nothing in these interfaces assumes a distributed store. No locks, leases,
watches, pub/sub, or compare-and-swap. Everything is keyed lookup and write, with plain
`context.Context` and return values. The library never holds a transaction across calls
and never requires two storage calls to be atomic with respect to each other.

- Auth requests: insert by ID, read by ID, read by code, update to attach a code,
  delete. Five queries against one table with a unique index on `code`.
- Tokens: insert, read by refresh token value, delete. The library never asks us to
  scan or list.
- Keys: read-only, cacheable at startup.
- Clients: read-only if config-driven.

Opaque access tokens are an encrypted `tokenID:subject` pair, so userinfo resolves to a
primary-key lookup rather than a scan.

The one place worth a transaction is `CreateAccessAndRefreshTokens` during a refresh,
where deleting the old refresh token and inserting the new one should be atomic. A
single `IMMEDIATE` transaction in WAL mode covers it. Nothing here would make us wish
for Postgres, which also satisfies the map's note that the storage decision must not
preclude Postgres later.

Three things we own that the library does not:

Expiry. There is no TTL concept anywhere. The `DeviceAuthorizationStorage` doc comment
warns outright that user codes are low entropy and "implementers of this interface must
make sure that user codes of expired authentication flows are purged." Nothing sweeps.
We need a periodic indexed `DELETE` over auth requests, codes, device codes, and expired
refresh tokens. Cheap on SQLite. Add it early, because forgetting it is how the device
code collision bug finds you in year two.

Refresh token security. The library calls `CreateAccessAndRefreshTokens` and takes
whatever string we return. Its own doc says "The storage implementation is responsible
for creating the complete refresh token." There is no rotation logic, no token family
tracking, no reuse detection in `pkg/op`. The in-memory example rotates but does not
detect reuse: replaying an old token returns an error and leaves the rest of the family
alive. RFC 6819 family revocation is ours to write.

Signing key rotation. `KeySet(ctx)` returns whatever we give it and the JWKS endpoint
publishes all of it. `SigningKey(ctx)` returns exactly one key and we choose which.
Verification does do `kid` selection. So the mechanism for rotation exists (publish old
and new, flip the signing key, retire the old after the ID token TTL) but generation,
persistence, scheduling, and grace periods are entirely ours. The example says so
directly: "this example only has a single signing key without key rotation."

Two rough edges in the interface itself. `RevokeToken(ctx, tokenOrTokenID, userID, clientID)`
overloads its first parameter, which is a token ID when revoking an access token and the
raw refresh token when revoking a refresh token, distinguished by whether `userID` is
empty. And `CreateAccessToken` takes a `TokenRequest` that may be one of four concrete
types, so we type-switch to reach client ID, auth time, and AMR. If we skip token
exchange and JWT profile, that switch stays short.

There is no SQL reference implementation in the repo. There is a complete in-memory one
that is a real importable package, `github.com/zitadel/oidc/v3/example/server/storage`,
938 lines covering auth requests, tokens, refresh rotation, token exchange, device flow,
and client credentials, plus a 235-line `op.Client` implementation. Porting maps to
tables is mostly mechanical.

### Escape hatches

This is the library's strongest area and the part that most justifies picking it despite
the frozen feature backlog.

Two provider APIs coexist. The classic `op.NewProvider(config, storage, issuerFn, opts...)`
builds a chi router internally. The newer `op.Server` interface plus
`op.RegisterServer(...)` gives 18 methods covering every protocol operation, from
`Discovery` and `Keys` through `CodeExchange`, `RefreshToken`, `UserInfo`, and
`EndSession`. Embed `op.UnimplementedServer` and override only what you want, and
`op.NewLegacyServer(provider, endpoints)` wraps a storage-based provider so we can start
classic and override handlers later. That is a genuine escape hatch: override one
method, keep the other seventeen.

The catch is that `op.Server`, `Request[T]`, `ClientRequest[T]`, and `RegisterServer` are
all marked "EXPERIMENTAL: may change until v4" in the source, and the tracking issue
(#440) has been open since September 2023. The more flexible API is also the one whose
signature may move.

Beyond that: every endpoint path is swappable through `WithCustom*Endpoint` options, and
passing `nil` for an endpoint in `RegisterServer` skips registering the route entirely,
which is a clean way to never expose device flow or token exchange. Claims have three
hooks (`GetPrivateClaimsFromScopes`, `GetPrivateClaimsFromRequest`,
`SetUserinfoFromRequest`) that between them control the full claim set, plus per-client
scope restriction on the `Client` interface. `op.AuthorizeValidator` replaces auth
request validation wholesale. `op.WithCrypto` replaces opaque-token encryption.

Routing: the library builds a chi mux but hands back a plain `http.Handler`, so we mount
it under our own router. The example does `router.Mount("/", handler)` with its own
`/login/` routes alongside. chi v5 is therefore a hard dependency in the binary whether
we use it or not, and OpenTelemetry is default-on but can be compiled out with the
documented `no_otel` build tag. Worth using for a small single binary.

Login is entirely ours, by design. `/authorize` validates, calls `CreateAuthRequest`,
then redirects to `client.LoginURL(authReqID)`. Our page authenticates the user, marks
the request authorized, and redirects back to
`<authorize endpoint>/callback?id=<requestID>`. The example's whole login
implementation is 77 lines. For a passkey-primary provider this is exactly right: the
library never renders anything except a `form_post` response template.

### Cost estimate

The complete example server is 2,837 lines including tests. The core split is about 100
lines of wiring and 900 to 1,200 lines of storage. `newOP` is a 50-line config literal
plus one constructor call. Most of the storage code is work we would do anyway for users
and sessions in SQLite; the library-specific tax is the adapter shape, 23 method
signatures plus 31 getters. Two to four days to a first working OP once the schema is
settled.

### One operational warning

v3.47.0 (2026-04-08) changed opaque access token encryption to use jose, and the release
notes lead with: "By secure default, all existing opaque access tokens emitted by OP
implementations, will be invalid. Users will need to re-login." The escape is
`op.WithCrypto(op.NewCompositeCrypto(...))` with the old `op.NewAESCrypto()` in the
decrypter slice. It is documented, and it shipped in a minor tag. Read the release notes
before bumping.

Smaller recurring theme: the library sometimes returns 500 `server_error` where the spec
wants a 400 with an OAuth error code (issue #945, PR #950, both August 2026). Strict RP
libraries surface these as opaque failures.

## The build-versus-adopt question underneath this

Worth recording, because it came up unprompted and it is the strongest evidence in the
whole survey.

Pocket ID is the closest analogue to blue-eyed that exists: a self-hosted, passkey-first
OIDC provider in Go, single container, team of three, 8,941 stars, BSD-2-Clause. It
hand-rolled its OIDC layer for about two years, reached OpenID certification doing so,
and then threw it away. PR #1520, "refactor: use fosite for OAuth 2.0 logic," merged
2026-06-22, +8,772 / -5,769 across 100 files. The maintainer's stated reason:

> Security: The library was developed by Ory which has a good reputation. I think it's
> more likely that our custom implementation, maintained by a team of three, has more
> vulnerabilities than Fosite.

Then, because upstream fosite was dead, they had to fork it two weeks later.

Tinyauth and Casdoor also hand-rolled and Tinyauth reached Basic OP certification, so
hand-rolling is provably achievable at this scale. But the project that most resembles
us ran that experiment for two years and spent 8,772 lines undoing it. That settles
build-versus-adopt for me.

Two useful side-facts from the same investigation: Pocket ID runs pure-Go SQLite through
`modernc.org/sqlite` with no cgo, and Tinyauth does the same. A fosite-lineage OP and a
cgo-free SQLite driver coexist in one static binary today.

## Notes for the ADR in #50

- Neither zitadel/oidc nor luikyv/go-oidc constrains the SQLite driver. Both storage
  interfaces are plain Go with `context.Context` and return values, so the driver
  decision stays independent and a cgo-free binary survives either choice. Only Dex,
  Authelia's own storage layer, and Hydra's SQLite builds drag in cgo, and we are using
  none of them.
- zitadel/oidc is Apache-2.0. Dependencies are MIT, BSD-3-Clause, Apache-2.0, and one
  Unlicense micro-dependency (`muhlemmer/gu`, owned by the lead maintainer). No copyleft
  anywhere, so blue-eyed's own license is unconstrained. `google/go-github/v31` appears
  in `go.mod` via a client example and will not reach our binary.
- The access patterns are keyed CRUD, so the schema this produces will port to Postgres
  later. That satisfies the map's note that the storage ADR must not actively preclude
  it.
- Build with the `no_otel` tag, and pin the version rather than tracking v3 latest,
  given the v3.47.0 precedent of a token-invalidating change in a minor release.
- Three things must appear as work items somewhere, because the library does not provide
  them and forgetting any of them is a security bug: signing key rotation, refresh token
  reuse detection with family revocation, and a periodic expiry sweeper.
- Do not enable the back-channel logout discovery flags. The delivery mechanism does not
  exist.

## Sources

- Module versions: `proxy.golang.org` for zitadel/oidc v3, luikyv/go-oidc, ory/fosite,
  and authelia.com/provider/oauth2, all queried 2026-08-20.
- https://github.com/zitadel/oidc, in particular `pkg/op/storage.go`, `pkg/op/server.go`,
  `pkg/op/discovery.go`, `pkg/op/keys.go`, `pkg/op/session.go`, `example/server/`,
  discussion #785, issues #427, #440, #924, #945, PRs #768, #782, #950, release v3.47.0
- https://github.com/zitadel/zitadel `go.mod` (pins `zitadel/oidc/v3 v3.47.5`)
- https://openid.net/certification/certified-openid-providers-profiles/ (raw HTML;
  CAOS / ZITADEL 1.53.1 / Basic OP / 04-Nov-2021, Luiky Vasconcelos / go-oidc >= 0.11.0 /
  five profiles / 10 and 11 Aug 2025, Authelia 4.39 / 13-May-2025)
- https://openid.net/developers/certified-openid-connect-implementations/ (zitadel OIDC
  v0.15.7, Basic RP and Config RP)
- https://github.com/ory/fosite (commit history, issues #778, #786, #875, #876, #882,
  #885), https://github.com/ory/hydra (`fosite/` directory, `go.mod`, v25.4.0 release
  notes), https://github.com/ory/fosite-example
- https://www.ory.com/docs/self-hosted/deployment ("SQLite is supported ... but must not
  be used in a production deployment")
- https://github.com/luikyv/go-oidc, in particular `pkg/goidc/model.go` and `go.mod`
- https://github.com/authelia/oauth2-provider and
  https://github.com/authelia/authelia/tree/master/internal/oidc
- https://github.com/pocket-id/pocket-id/pull/1520 and `backend/go.mod`
- https://github.com/dexidp/dex, https://github.com/go-oauth2/oauth2,
  https://github.com/openshift/osin, https://github.com/coreos/go-oidc
