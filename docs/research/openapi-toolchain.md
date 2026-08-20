# OpenAPI toolchain for the management plane

Research for issue #43 (map #37). Verified against primary sources on 2026-08-20. Every version number and issue reference below was checked against the repo, the release page, or the npm registry on that date, not recalled.

Scope: the management plane only (users, groups, services, invitations, sessions). The OIDC endpoints and the Traefik forward-auth endpoint are fixed external contracts and stay out of the spec, per #37.

## Recommendation

| Layer | Choice |
|---|---|
| Direction | Spec-first. `api/openapi.yaml` is hand-authored and is the source of truth. |
| Go server | `ogen` (github.com/ogen-go/ogen), v1.24.0 |
| TypeScript client | `@hey-api/openapi-ts` with the `@tanstack/react-query` plugin and `@hey-api/client-fetch`, pinned to an exact version |
| Auth scheme | `type: apiKey, in: cookie, name: <session cookie>`, global `security`, `security: []` on the login operation |
| Drift control | regenerate and `git diff --exit-code` on both ends, plus `oasdiff` breaking-change check against the base branch |

Everything else here is the argument for those five lines.

## Spec-first, and why code-first was rejected

The map already settles this ("API: OpenAPI spec with type generation, both ends"), so code-first would be a premise change. It is worth recording that it was examined on the merits and lost anyway, so nobody reopens it casually.

The case for code-first with huma is real: you write Go, huma derives the OpenAPI document by reflection, and the spec cannot describe an endpoint the server does not have. The drift disappears by construction. huma exports the document at build time via a Cobra subcommand calling `api.OpenAPI().YAML()`, documented at https://huma.rocks/features/cli/, so `go run . openapi > api/openapi.yaml` followed by a diff is a workable CI check.

Three findings kill it for this project.

**The drift moves, it does not vanish.** With a derived spec, a Go-side or router-side change can silently alter the published contract. Concrete instances in huma's own tracker: switching to route groups changed operation IDs and broke generated clients (danielgtaylor/huma#754); `required:"false"` on path params dropped the `required` field, a regression in v2.37.0 (#1009); regex in path params works at runtime but emits broken OpenAPI (#922, still open); `MultipartFormFiles` emitted an invalid `"in": "form"` parameter (#980). The `DowngradeYAML` path to 3.0.3 produces `description` siblings for `$ref` (#1001, open since March 2026). None of these classes of bug exist when the spec is the input.

**huma does not enforce security at all.** It documents the scheme and populates `Operation.Security`, and nothing reads that back and enforces it (https://github.com/danielgtaylor/huma/blob/main/docs/docs/features/middleware.md). You write the enforcement loop, and if you forget an operation it ships unauthenticated. For a service whose entire job is authentication, that asymmetry is disqualifying on its own.

**Bus factor.** v2.39.1 shipped 2026-07-29, but only 48 commits in six months, with `danielgtaylor` contributing 2 of them. In danielgtaylor/huma#911 Taylor explains he started a new job in Nov 2025 and that `wolveix` was brought on to help. Not abandoned, but thin.

What huma does better than either alternative, and worth stealing rather than adopting: RFC 9457 problem+json errors out of the box with exhaustive per-field validation details, and `http.Cookie` as a first-class typed request input.

## Go server: ogen over oapi-codegen

Both are healthy. ogen is v1.24.0 (2026-08-07), 254 commits in six months across four humans under the go-faster org, README badged stable. oapi-codegen is v2.8.0 (2026-07-17), 223 commits, two core maintainers who describe the project in discussion #1606 as "maintained in two busy peoples' free time."

One prior worth discarding: **oapi-codegen supports OpenAPI 3.1 as of v2.8.0**, released a month ago, via PR #2336 closing the years-old issue #373. The release is titled "OpenAPI 3.1, fewer assumptions, and a giant bug hunt". Anything you have read saying otherwise is out of date. ogen accepts 3.0, 3.1, and partially 3.2 (the version gate is in `openapi/parser/version.go`).

The decision turns on two things.

### Cookie session auth

This is the axis that matters most here, since blue-eyed's management API is guarded by blue-eyed's own session cookie.

**ogen generates the whole thing.** The generator emits a `SecurityHandler` interface with one method per scheme:

```go
type SecurityHandler interface {
    HandleAPIKey(ctx context.Context, operationName OperationName, t APIKey) (context.Context, error)
}
```

For an `apiKey` located `in: cookie`, the security template (`gen/_template/security.tmpl`) generates the `req.Cookie(name)` read, the `http.ErrNoCookie` branch, and the wrapping. You pass your implementation as the second argument to `NewServer`. Two details carry the decision:

- The handler **returns a `context.Context`**. You resolve the session once, put the authenticated principal on the context there, and every handler downstream reads it. No second middleware, no duplicated lookup.
- Returning `ogenerrors.ErrSkipServerSecurity` opts a request out, which is how you express the login and invitation-acceptance endpoints without weakening the global requirement.

Per-operation scopes arrive as `t.Roles` from a generated `operationRolesAPIKey` map, which lines up with the coarse per-service authorization model in #37.

**oapi-codegen makes you reach through kin-openapi.** The old scopes-on-context mechanism was removed by default in v2.8.0 (PR #2440); the release notes call it "fundamentally broken: it can't represent alternative (OR), combined (AND), or anonymous (`{}`) security requirements." The supported path is `openapi3filter.Options{AuthenticationFunc: ...}` passed into `nethttp-middleware`. Your function receives an `*openapi3filter.AuthenticationInput` carrying the scheme (so you can read `.In == "cookie"` and `.Name`) and the request, and you read the cookie yourself. kin-openapi's `ValidateSecurityRequirements` handles OR semantics correctly.

Two frictions. You cannot have auth without also adopting the validation middleware, they are the same component. And `AuthenticationInput` gives you **no return-context channel**, so propagating the resolved session means mutating the request context from inside the auth function, which is exactly the kind of implicit coupling you do not want in the one code path that decides who someone is.

### Number of things that can drift

ogen has one artifact. The spec is the input, `go generate` is the build step, and routing, JSON decode, constraint validation, and auth dispatch all come out of the same generator. Required-field enforcement is a `requiredBitSet` bitmask in the generated decoder; constraints land in `oas_validators_gen.go`. A spec change that breaks a handler is a compile error.

oapi-codegen has three: the generator, the separately versioned `nethttp-middleware`, and kin-openapi underneath. **oapi-codegen generates no request-body validation** (its README: "this leaves a lot of validation that needs to be done"), so the middleware is not optional. kin-openapi is pre-1.0, ships breaking changes freely (v0.147.0 landed 2026-08-18), and is single-maintainer; oapi-codegen's README has a dedicated FAQ entry apologising for the breakage this causes. There are also three separate error handlers to unify (middleware `ErrorHandlerWithOpts`, generated-server `ErrorHandlerFunc`, strict-mode `ResponseErrorHandlerFunc`), and the `spec.Servers`-must-be-nil trap that 400s valid requests (deepmap/oapi-codegen#882).

### What ogen costs

- **Generated code volume, around 10x the spec.** The ent example is ~316KB of Go from a 32KB spec; petstore is 66KB from 2.7KB. Commit it, mark it `linguist-generated` in `.gitattributes`, and stop reading it.
- **Its own generated router only.** `NewServer(...)` returns an `http.Handler`. For blue-eyed this is fine and arguably right: mount it under `/api/v1` on a plain `net/http` mux and hand-write the protocol plane (OIDC, forward-auth) beside it. It does mean no chi or echo middleware ecosystem, which is a live input to #39 and #50.
- **Error shape is yours to write.** `ogenerrors.DefaultErrorHandler` writes `{"error_message": "..."}`. `ErrorCode(err)` already maps `*SecurityError` to 401 and decode errors to 400, so a `WithErrorHandler` that type-switches into RFC 9457 problem+json is roughly one file. Note ogen#1514: `NewError` is not used when parameters fail to decode, so the spec-declared `default` response will not cover that case.
- **Medium-term risk:** ogen#1610 plans a migration to `pb33f/libopenapi` and `ogen-go/schemacompiler` for full 3.2 support, which is a rewrite of the parsing layer.

ogen's failure mode is that awkward schemas produce a generation error or non-compiling Go (#1480, #1471, #1448), which you find at build time. For a hand-written CRUD spec you will likely never touch these.

**Take oapi-codegen instead if** the router ecosystem turns out to matter for the protocol plane, or if generated code that reads like hand-written Go is worth the extra moving parts. Configure it `strict-server: true`, `std-http-server: true`, `embedded-spec: true`.

## TypeScript client

### The default answer is currently broken

`openapi-typescript` + `openapi-fetch` + `openapi-react-query` is the stack most people would name, and I would have too. It is stalled.

- Last publish for all three: **2026-02-11** (`openapi-typescript` 7.13.0, `openapi-fetch` 0.17.0, `openapi-react-query` 0.5.4). No human commit on main since 2026-02-27.
- **It crashes under TypeScript 7** (openapi-ts/openapi-typescript#2841), which has been npm `latest` since 2026-07-08. The workaround is pinning `typescript@6` for the codegen step.
- #2846: `@redocly/openapi-core` 1.x is archived and pulls in vulnerable `js-yaml` 4.2.0 (GHSA-52cp-r559-cp3m), failing `pnpm audit`.
- #2843 ("Is this project still maintained?", 2026-07-15) has no maintainer reply. In discussion #2831 maintainer `duncanbeevers` said on 2026-07-06 that it is maintained but his schedule is "swamped"; nothing has landed in the six weeks since. Hey API's maintainer has publicly offered to rehome the library.

This is a shame, because the design is good: a real exported `queryOptions()`, a `DataTag`-branded `[method, path, init]` key that prefix-invalidates cleanly, and a 6 kB runtime with zero per-endpoint JavaScript. Do not start on it today.

### The choice: hey-api

**Use `@hey-api/openapi-ts` (0.99.0) with the `@tanstack/react-query` plugin.**

The deciding property is the shape of the output, not the feature list. TanStack Router loaders need `queryOptions` objects, not hooks. Hey API is the only candidate whose **default** output is options factories with hooks turned off: per `packages/openapi-ts/src/plugins/@tanstack/react-query/config.ts`, `queryOptions`, `infiniteQueryOptions`, `mutationOptions` and `queryKeys` are enabled by default while `useQuery`, `useMutation`, `setQueryData` and `getQueryData` are `enabled: false` and opt-in. There is no generated hook to fight. The same object goes into `useQuery` in a component, `ensureQueryData` in a loader, and `useQueries` in a dashboard.

It also calls TanStack's own `queryOptions()` helper rather than hand-rolling the option types, so it cannot drift from TanStack's types. `signal` is forwarded. Errors are typed.

Costs, stated plainly:

- **Still 0.x after two years, and minor bumps break.** The 0.99.0 release notes open with "This release has 4 breaking changes." Pin the exact version and treat regeneration as a reviewed diff, never a `postinstall`.
- **Solo maintainer with commercial ambitions**, 558 open issues, `mrlubos` with 77 commits in 90 days. Licensing is plain MIT today with no paid plugins or gated features (checked the plugins index and license page); recheck before committing hard.
- **Query key shape is not yours to change** (#2040, open since 2025-05). You get `[{ _id, baseUrl, path, tags }]`.
- **No per-status response narrowing** (#495, open since 2024-04). kubb is better here.

### Runners-up

**kubb** has the best generated code of the four. Its checked-in snapshot calls TanStack's real `queryOptions()` and narrows response types per status code (`GetPetByIdStatus200`, `ResponseErrorConfig<GetPetByIdStatus400>`), which nothing else does. The problem is timing and staffing: `@kubb/core` 5.0.0 shipped 2026-08-17 and `@kubb/plugin-react-query` 5.0.0 on 2026-08-19, three days and one day before this was written. v5 is a ground-up rewrite that moved every plugin into a separate repo created in April 2026. Commit authorship over 90 days is `claude` 56 and `stijnvanhulle` 41 on the main repo. Revisit in six months.

**orval** (8.24.0, 2026-08-08) has the healthiest contributor bench by far, seven distinct humans over 90 days, and emits the widest range of artifacts. But orval-labs/orval#1788, open nineteen months, is precisely the "you will fight it" defect: it hand-rolls its own options object types instead of delegating to TanStack's `queryOptions()`, and they fail to stay assignable (`refetchInterval` variance on `useSuspenseQuery`). Hook signatures are rigid too (#2397: passing `string | undefined` is a type error even though the hook handles it internally). It is the defensible fallback if 0.x is unacceptable; budget a thin hand-written wrapper around `getXxxQueryOptions` to insulate against #1788.

### Client setup

`openapi-ts.config.ts` reads the committed spec file, not a running server, so codegen works offline and in CI:

```ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../api/openapi.yaml',
  output: { path: 'src/api/gen', format: 'prettier' },
  plugins: [
    { name: '@hey-api/client-fetch', runtimeConfigPath: './src/api/runtime.ts' },
    '@hey-api/typescript',
    '@hey-api/sdk',
    { name: '@tanstack/react-query' },
  ],
});
```

`src/api/runtime.ts`, where the session cookie is handled:

```ts
import type { CreateClientConfig } from './gen/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: 'include',
});
```

In a component and in a router loader, same object:

```tsx
const { data } = useQuery(listUsersOptions({ query: { page } }));
```

```ts
export const Route = createFileRoute('/users')({
  loader: ({ context }) => context.queryClient.ensureQueryData(listUsersOptions({ query: { page: 1 } })),
});
```

Mutation with invalidation:

```tsx
const { mutate } = useMutation({
  ...createUserMutation(),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: listUsersQueryKey() }),
});
```

That last line relies on TanStack Query's deep-partial key matching against hey-api's object key shape. The key shape is verified from hey-api's generator source; the partial-match behaviour is inferred from how the two fit together and should get a five-minute check against the real spec before anyone leans on it.

## Auth on the management API itself

### Declaring it

OpenAPI 3.1 and 3.2 express cookie auth identically. The Security Scheme Object's `in` field takes "`query`, `header` or `cookie`" and `name` is required for `apiKey` (https://spec.openapis.org/oas/v3.1.1.html). Note the current spec release is 3.2.0, published 2025-09-19; nothing relevant changed.

```yaml
components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: blue_eyed_session

security:
  - sessionCookie: []      # global default

paths:
  /sessions:
    post:
      security: []         # login is anonymous
```

`security: []` on an operation removes the top-level requirement. On the Go side that pairs with `ogenerrors.ErrSkipServerSecurity`.

Known limitation, worth writing down so nobody debugs it twice: Swagger UI "try it out" cannot work with cookie auth, because browsers forbid scripts from setting the `Cookie` header (swagger-api/swagger-ui#9710). It works by accident when the docs are served same-origin and you are already logged in, and never from a separate docs host.

### The cross-domain worry does not apply here

The map's multi-domain premise is about **protected services**, which live on the protocol plane. The admin UI is served by blue-eyed itself, so the management API is same-origin. That is worth defending, because it keeps you out of `SameSite=None` third-party-cookie territory entirely.

So: `SameSite=Lax; Secure; HttpOnly`. Note that "same site" means registrable domain plus scheme, not same origin, so `admin.example.com` calling `api.example.com` still works under Lax, though it needs CORS with an explicit `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials: true` (a wildcard origin is rejected outright when credentials are present).

`fetch`'s `credentials` defaults to `same-origin` (MDN, `RequestInit`), so a same-origin deployment needs nothing. Set `credentials: 'include'` anyway, because the Vite dev server runs on a different port.

### CSRF

OWASP's current cheat sheet has moved on from what most people remember. Naive double-submit is now called out as bypassable; the token recommendation is the **signed** double-submit pattern, HMAC-tied to the session. But for a JSON API you can avoid tokens entirely with three cheap rules:

1. Reject state-changing methods carrying `Sec-Fetch-Site: cross-site`. The `Sec-` prefix makes the header unforgeable by page script. OWASP requires a fallback to `Origin` checking for browsers that omit it, so implement both.
2. Require `Content-Type: application/json` on writes. `application/json` is not on the CORS safelist, so a cross-origin attacker cannot reach the endpoint without a preflight you decline.
3. `SameSite=Lax` as defence in depth, not as the primary control. Lax still permits top-level navigations with safe methods.

Reach for signed double-submit only if a cross-site deployment or a legacy-browser requirement ever breaks rule 1.

## Where the spec lives, and stopping drift

**`api/openapi.yaml`, one file, hand-authored, committed.** The `/api` convention comes from golang-standards/project-layout, which is widely copied but explicitly not an official Go standard; cite it as "what people do."

Do not split with `$ref` yet. Support is uneven: oapi-codegen maps whole documents to Go packages via `import-mapping` and cannot take a JSON pointer as a key; openapi-typescript punts to `redocly bundle`. If one file ever stops being enough, author split and bundle into the committed `api/openapi.yaml`, and point every downstream tool at the bundle only.

Because the spec is the input on both ends, spec-to-implementation drift is a compile error in Go and a type error in TypeScript. What CI still needs to catch is **stale generated code** and **unintended breaking changes**:

1. `go generate ./...` then `git diff --exit-code` (oapi-codegen's README recommends exactly this pattern, and it applies equally to ogen).
2. `npx @hey-api/openapi-ts` then `git diff --exit-code`, then `tsc --noEmit`.
3. `redocly lint api/openapi.yaml`. Redocly CLI has no `diff` command, despite what you may have read; the command list is lint/bundle/join/split/build-docs/preview/score/stats/drift/respect and others.
4. `oasdiff/oasdiff-action/breaking` with `fail-on: WARN`, diffing `origin/${{ github.base_ref }}:api/openapi.yaml` against `HEAD:api/openapi.yaml`. **oasdiff is the live option**: v1.29.1 released 2026-08-16, weekly cadence, Apache-2.0, supports 3.0/3.1/3.2, canonical repo now github.com/oasdiff/oasdiff. The Java OpenAPITools/openapi-diff has not released since January 2025.

Also worth knowing but not needed on day one:

- **Spectral looks abandoned and is not.** Last tag is v6.16.3 from August 2024, but the develop branch has commits through 2026-08-19. Prefer `redocly lint` unless you want custom style rules.
- **`libopenapi-validator`** (pb33f, MIT) validates `http.Request`/`http.Response` against the spec inside ordinary Go tests. Better first reach than Schemathesis, which is healthy (v4.24.3, 2026-07-25, supports 3.1) but drags a Python runtime, a stale action wrapper still using the removed `--base-url` flag, and property-test flake into CI for two people.
- **Dredd is archived** (November 2024). Do not reach for it.

## Open threads for other tickets

- ogen's generated server is an `http.Handler` mounted on a plain `net/http` mux, which constrains the OIDC library choice in #39 and the backend stack in #50: there is no chi/echo middleware ecosystem in play.
- `embedded-spec` equivalence: serving `api/openapi.yaml` from the binary for the admin UI's own docs is unresolved. ogen does not embed the spec the way oapi-codegen's `embedded-spec` does; a `go:embed` of the file is the obvious answer.
- The RFC 9457 error model needs to be written into the spec by hand, since ogen will not invent it. Worth copying huma's `ErrorModel` shape (`status`, `title`, `detail`, `errors[].{location,message,value}`).
