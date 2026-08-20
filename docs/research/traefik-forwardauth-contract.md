# Traefik ForwardAuth: the wire contract

Research for [#40](https://github.com/Eloquentia-Studios/blue-eyed/issues/40) (map: [#37](https://github.com/Eloquentia-Studios/blue-eyed/issues/37)).

Verified 2026-08-20 against Traefik **v3.7.11** (current stable, released 2026-08-19) and **v2.11.55** (v2 maintenance line). Every claim below traces to source code or the docs shipped in the same tag, not to a blog post.

Primary sources:

- `pkg/middlewares/auth/forward.go` at [v3.7.11](https://github.com/traefik/traefik/blob/v3.7.11/pkg/middlewares/auth/forward.go) and [v2.11.55](https://github.com/traefik/traefik/blob/v2.11.55/pkg/middlewares/auth/forward.go). At v3.7.11 this file is byte-identical to `master`.
- `pkg/config/dynamic/middlewares.go` ([v3.7.11](https://github.com/traefik/traefik/blob/v3.7.11/pkg/config/dynamic/middlewares.go)) for the option struct, keys and defaults.
- `pkg/middlewares/forwardedheaders/forwarded_header.go` ([v3.7.11](https://github.com/traefik/traefik/blob/v3.7.11/pkg/middlewares/forwardedheaders/forwarded_header.go)) for `XHeadersSet` and `DeleteXForwardedHeaders`.
- [docs/content/reference/routing-configuration/http/middlewares/forwardauth.md](https://github.com/traefik/traefik/blob/v3.7.11/docs/content/reference/routing-configuration/http/middlewares/forwardauth.md), rendered at <https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/>. The old `/middlewares/http/forwardauth/` URL is now a redirect stub.
- Traefik's published security advisories via the GitHub API.

## The one-paragraph version

Traefik calls your endpoint with a **GET, no body, no path of its own** (the full URL comes from `address`), carrying a copy of the client's headers plus `X-Forwarded-Method`, `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-Uri`, `X-Forwarded-Port` and `X-Forwarded-For`. Answer **2xx** and the original request proceeds to the backend, with the headers you named in `authResponseHeaders` replaced by your values. Answer **anything else, including 3xx**, and your entire response (status, body, and headers such as `Location` and `Set-Cookie`) is relayed to the browser verbatim. That is the whole protocol.

## What Traefik sends to the auth server

### Method, URL and body

```go
forwardReqMethod := http.MethodGet
if fa.preserveRequestMethod {
    forwardReqMethod = req.Method
}
forwardReq, err := http.NewRequestWithContext(req.Context(), forwardReqMethod, fa.address, nil)
```
(forward.go:161-166)

- Default method is **GET**, whatever the client used. `preserveRequestMethod: true` (v3.4.0+) makes the auth call mirror the client's verb. The backend always sees the original method either way.
- The URL is exactly `address`. Traefik does **not** append the original path. The original path reaches you only via `X-Forwarded-Uri`.
- Body is `nil` unless `forwardBody: true` (v3.3.0+). With it on, Traefik buffers the whole body in memory and replays it to both the auth server and the backend. Streaming breaks. A body over `maxBodySize` gets rejected with **401**, not 413. Default `maxBodySize` is `-1`, meaning unlimited, and Traefik logs a startup warning about it.
- A CONNECT request with unknown content length never forwards its body (v3.7.9 / v3.6.24, PR #13543): those bytes are tunnel data.
- The HTTP client has a **hardcoded 30 second timeout** and never follows redirects (`CheckRedirect` returns `http.ErrUseLastResponse`). There is no config knob for either.

### Headers copied from the client

Traefik copies every client header, then removes hop-by-hop ones:

```go
var hopHeaders = []string{
    forward.Connection, forward.KeepAlive, forward.Te,
    forward.Trailers, forward.TransferEncoding, forward.Upgrade,
}
```
(forward.go:38-45)

`RemoveConnectionHeaders` additionally drops every token named in `Connection:`. Note what survives on purpose: `Cookie`, `Authorization`, and `Proxy-Authorization` (the source comment cites [RFC 7235 §4.4](https://tools.ietf.org/html/rfc7235#section-4.4) for the last one). For blue-eyed this matters. **The session cookie arrives on the auth request by default.**

### The X-Forwarded headers, and exactly when each is set

With `trustForwardHeader` explicitly set, `writeHeader` (forward.go:428-475) fills each header only if it is not already present after the trust decision:

| Header | Value | Set when |
|---|---|---|
| `X-Forwarded-Method` | `req.Method`, the **original client verb** | if absent |
| `X-Forwarded-Proto` | `https` if `req.TLS != nil`, else `http` | if absent |
| `X-Forwarded-Host` | `req.Host` | if absent |
| `X-Forwarded-Uri` | `req.URL.RequestURI()`, **path plus query string** | if absent |
| `X-Forwarded-Port` | port from `req.Host`, else 443 for https/wss, else 443 if TLS, else `80` | if absent |
| `X-Forwarded-For` | client IP, with any trusted prior value prepended | always, when `RemoteAddr` parses |

Two details that bite:

- `X-Forwarded-Method` is the client's real method even when `preserveRequestMethod` is off. That is how you see a POST while being called with GET.
- `X-Forwarded-Uri` includes the query string. `/app/page?next=/foo` arrives whole.

The docs only list five of these ([Forward-Request Headers](https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/#forward-request-headers)); `X-Forwarded-Port` is in the code but missing from that table.

If the incoming request had no `User-Agent`, Traefik sets an empty one so Go's default client UA does not leak through (forward.go:438-442, v3 only).

## trustForwardHeader has three states, not two

`TrustForwardHeader` is a `*bool`. The nil case is its own behavior:

```go
if fa.trustForwardHeader != nil {
    writeHeader(req, forwardReq, *fa.trustForwardHeader, fa.authRequestHeaders)
} else {
    oldWriteHeader(req, forwardReq, fa.authRequestHeaders)
}
```
(forward.go:209-213)

**`true`**: nothing is stripped. Every `X-Forwarded-*` the client sent passes through untouched, and the `if absent` guards mean Traefik overwrites none of them. Client `X-Forwarded-For` is prepended to the real peer IP. Traefik also force-adds all of `XHeadersSet` to `authRequestHeaders` so the allowlist filter cannot drop them (forward.go:147-149). An untrusted client can therefore dictate `X-Forwarded-Host`, `X-Forwarded-Uri`, `X-Forwarded-Method`, `X-Forwarded-Proto`, `X-Forwarded-For`, `X-Forwarded-Prefix`, `X-Real-Ip`, `X-Forwarded-Server`, and the TLS client-cert headers. **Only use `true` when the entrypoint sanitizes them first.**

**`false`**: `forwardedheaders.DeleteXForwardedHeaders` wipes all thirteen managed headers, including underscore variants such as `X_Forwarded_Proto` that Go's server preserves verbatim, then Traefik re-derives everything from the actual connection.

**unset**: the legacy `oldWriteHeader` path (forward.go:479-500). It overwrites `X-Forwarded-For`, `-Proto`, `-Method`, `-Host` and `-Uri`, **never sets `X-Forwarded-Port` at all**, and leaves `X-Forwarded-Prefix`, `X-Real-Ip`, `X-Forwarded-Server` and the TLS client-cert headers fully client-controlled. Traefik logs a startup warning saying exactly this. A test in the tree is literally named "X-Forwarded-Prefix is kept for non-breaking behavior".

The option is **deprecated as of v3.7.0** (backported to v3.6.14, PR #13012). The documented replacement is to set `forwardedHeaders.trustedIPs` at the entrypoint and `trustForwardHeader: true` on the middleware, so the entrypoint does the sanitizing and the middleware trusts what survives.

### Advisories worth knowing

| Advisory | CVE | Sev | Patched |
|---|---|---|---|
| [GHSA-6384-m2mw-rf54](https://github.com/traefik/traefik/security/advisories/GHSA-6384-m2mw-rf54) ForwardAuth `trustForwardHeader=false` allows spoofed `X-Forwarded-Prefix` to bypass auth | CVE-2026-35051 | high | v2.11.43, v3.6.14, v3.7.0-rc.2 |
| [GHSA-3q9r-p662-5j8m](https://github.com/traefik/traefik/security/advisories/GHSA-3q9r-p662-5j8m) `X-Forwarded-Port` spoofing via untrusted `X-Forwarded-Proto` when `trustForwardHeader=false` | CVE-2026-54764 | medium | v2.11.51, v3.6.22, v3.7.6 |
| [GHSA-x677-9fxg-v5c5](https://github.com/traefik/traefik/security/advisories/GHSA-x677-9fxg-v5c5) `headerField` underscore-variant identity spoofing in BasicAuth / DigestAuth / ForwardAuth | CVE-2026-54763 | high | v2.11.51, v3.6.22, v3.7.6 |
| [GHSA-fw45-f5q2-2p4x](https://github.com/traefik/traefik/security/advisories/GHSA-fw45-f5q2-2p4x) unbounded auth response body, DoS | CVE-2026-26998 | medium | v2.11.38, v3.6.9 |

Three of the four are header-trust bugs in this one middleware. blue-eyed should treat every `X-Forwarded-*` value as an assertion by the operator's Traefik config, and it should document a minimum Traefik version.

## authRequestHeaders: what blue-eyed can ask to receive

```go
func filterForwardRequestHeaders(forwardRequestHeaders http.Header, allowedHeaders []string) http.Header {
    if len(allowedHeaders) == 0 {
        return forwardRequestHeaders
    }
    filteredHeaders := http.Header{}
    for _, headerName := range allowedHeaders {
        if values := forwardRequestHeaders.Values(headerName); len(values) > 0 {
            filteredHeaders[http.CanonicalHeaderKey(headerName)] = values
        }
    }
    return filteredHeaders
}
```
(forward.go:502-515)

Unset or empty means **all** client headers pass, cookies and `Authorization` included. Set it and you get a strict allowlist that replaces the whole header map. The classic breakage is setting `authRequestHeaders: ["X-Foo"]` and silently losing `Cookie`, which kills every cookie-based auth server including blue-eyed.

The filter runs **before** the X-Forwarded block, so Traefik's own `X-Forwarded-*` headers always arrive regardless of the allowlist. It also cannot invent headers: absent ones stay absent.

A blue-eyed operator who wants a tight allowlist needs at least `Cookie` and `Accept`.

## authResponseHeaders: how identity reaches the backend

Only reached on 2xx.

```go
for _, headerName := range fa.authResponseHeaders {
    headerKey := http.CanonicalHeaderKey(headerName)
    req.Header.Del(headerKey)
    if len(forwardResponse.Header[headerKey]) > 0 {
        req.Header[headerKey] = append([]string(nil), forwardResponse.Header[headerKey]...)
    }
}

if fa.authResponseHeadersRegex != nil {
    for headerKey := range req.Header {
        if fa.authResponseHeadersRegex.MatchString(headerKey) {
            req.Header.Del(headerKey)
        }
    }
    for headerKey, headerValues := range forwardResponse.Header {
        if fa.authResponseHeadersRegex.MatchString(headerKey) {
            req.Header[headerKey] = append([]string(nil), headerValues...)
        }
    }
}
```
(forward.go:320-340)

Answering the ticket's question directly: **what stops a client sending `X-Forwarded-User` itself is the unconditional `req.Header.Del(headerKey)`, and nothing else.**

- The `Del` runs before the guard, so a listed header is stripped from the client request **even when the auth server does not return it**. `authResponseHeaders` is a strip-list as much as a copy-list.
- Assignment replaces rather than appends. Multi-value headers survive intact.
- Headers the auth server returns that are **not** listed are discarded, never forwarded.
- Headers the client sends that are **not** listed pass through to the backend untouched. Traefik's own source comment (forward.go:314-319) calls this deliberate, mirroring ingress-nginx: "Traefik asserts no identity the operator did not opt into: trusting unlisted client headers downstream is a backend misconfiguration, not a spoofing flaw here."
- The regex variant matches against the **canonical header key only**, never the value, and it strips every matching client header first, then copies every matching auth-response header. `^X-Blue-` as a regex is a cleaner guarantee than a hand-maintained list, because it strips the whole namespace whether or not blue-eyed returned each member.

The obligation this puts on blue-eyed: publish a **fixed, namespaced set** of identity headers, tell operators to list all of them (or match the namespace by regex), and never emit an identity header outside that namespace. Recommend the regex form in our docs. A list that drifts out of sync with what blue-eyed emits is the header-spoofing hole.

`headerField` is unrelated to this. It copies one auth-response header value into Traefik's **access log** as `ClientUsername`. It adds nothing to the backend request.

## Response semantics

One condition governs everything:

```go
// Pass the forward response's body and selected headers if it
// didn't return a response within the range of [200, 300).
if forwardResponse.StatusCode < http.StatusOK || forwardResponse.StatusCode >= http.StatusMultipleChoices {
```
(forward.go:285, identical at v2.11.55:166)

| Auth server returns | Traefik does |
|---|---|
| **2xx (200-299)** | Applies `authResponseHeaders` / regex, forwards the original request to the backend |
| **3xx** | Relays to the client. **Not** treated as success. The browser follows it. This is how login redirects work. |
| **401** | Relays to the client, unless `authSigninURL` is set, in which case Traefik replies `302` to that URL instead |
| **403** | Relays to the client. `authSigninURL` does **not** fire on 403. |
| **1xx, 4xx, 5xx** | Relays to the client |
| transport error | 500, or 499 `StatusClientClosedRequest` on client cancellation (v3 only) |
| response body over `maxResponseBodySize` | 401 |

On the relay path Traefik copies **all** auth-response headers minus hop-by-hop, writes the status, then writes the **entire body verbatim**. `Set-Cookie`, `WWW-Authenticate`, `Proxy-Authenticate` and `Content-Type` all reach the browser. Two consequences for blue-eyed: our 401/403 bodies are user-visible, so they must be presentable and must not leak internals; and we **can** set a session or state cookie on a denial, which is how a CSR redirect flow stashes the return URL.

### The redirect trap

```go
func (fa *forwardAuth) redirectURL(forwardResponse *http.Response) (*url.URL, error) {
    if !fa.preserveLocationHeader {
        return forwardResponse.Location()
    }
    if lv := forwardResponse.Header.Get("Location"); lv != "" {
        return url.Parse(lv)
    }
    return nil, http.ErrNoLocation
}
```
(forward.go:355-365)

By default (`preserveLocationHeader: false`), Traefik runs the auth response through `http.Response.Location()`, which resolves the header **relative to the auth request URL**. A relative `Location: /login` from blue-eyed at `http://blue-eyed:8080/api/forward-auth` comes back to the browser as `http://blue-eyed:8080/login`, an internal address the browser cannot reach. This is the number one cause of "my forward-auth redirect goes to a container hostname" reports.

**blue-eyed should always emit an absolute `Location` pointing at its public origin.** That sidesteps the rewrite entirely and works whether or not the operator sets `preserveLocationHeader`. Given the multi-domain premise from #37, we need the absolute public URL anyway, since there is no shared parent domain to fall back on.

### Cookies on the success path

```go
authCookies := forwardResponse.Cookies()
if len(authCookies) == 0 {
    fa.next.ServeHTTP(rw, req)
    return
}
fa.next.ServeHTTP(middlewares.NewResponseModifier(rw, req, fa.buildModifier(authCookies)), req)
```
(forward.go:346-352)

On a 2xx, cookies blue-eyed sets are **dropped** unless the operator lists them in `addAuthCookiesToResponse` (v3.0.0+). `buildModifier` deletes all backend `Set-Cookie` headers, re-adds the backend ones whose name is not on the list, then adds the auth-server ones whose name is on the list. Sliding-window session renewal on a successful check therefore needs operator cooperation, which is a real constraint on our session design.

## Config an operator will actually paste

### File provider, YAML

```yaml
http:
  middlewares:
    blue-eyed:
      forwardAuth:
        address: "http://blue-eyed:8080/api/forward-auth"
        trustForwardHeader: false
        authResponseHeadersRegex: "^X-Blue-Eyed-"
        maxResponseBodySize: 65536
        addAuthCookiesToResponse:
          - "blue_eyed_session"

  routers:
    sonarr:
      rule: "Host(`sonarr.example.com`)"
      service: sonarr
      middlewares:
        - blue-eyed
```

Explicit list instead of the regex, if you prefer:

```yaml
        authResponseHeaders:
          - "X-Blue-Eyed-User"
          - "X-Blue-Eyed-Email"
          - "X-Blue-Eyed-Groups"
```

TOML equivalent:

```toml
[http.middlewares]
  [http.middlewares.blue-eyed.forwardAuth]
    address = "http://blue-eyed:8080/api/forward-auth"
    trustForwardHeader = false
    authResponseHeadersRegex = "^X-Blue-Eyed-"
    maxResponseBodySize = 65536
    addAuthCookiesToResponse = ["blue_eyed_session"]
```

### Docker labels

The middleware segment is lowercase `forwardauth`; option names keep camelCase; lists are comma-separated in one label.

```yaml
services:
  blue-eyed:
    image: eloquentia/blue-eyed:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.middlewares.blue-eyed.forwardauth.address=http://blue-eyed:8080/api/forward-auth"
      - "traefik.http.middlewares.blue-eyed.forwardauth.trustForwardHeader=false"
      - "traefik.http.middlewares.blue-eyed.forwardauth.authResponseHeadersRegex=^X-Blue-Eyed-"
      - "traefik.http.middlewares.blue-eyed.forwardauth.maxResponseBodySize=65536"
      - "traefik.http.middlewares.blue-eyed.forwardauth.addAuthCookiesToResponse=blue_eyed_session"
      - "traefik.http.routers.blue-eyed.rule=Host(`auth.example.com`)"
      - "traefik.http.services.blue-eyed.loadbalancer.server.port=8080"

  sonarr:
    image: linuxserver/sonarr
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sonarr.rule=Host(`sonarr.example.com`)"
      - "traefik.http.routers.sonarr.middlewares=blue-eyed@docker"
```

The `@docker` provider suffix on the middleware reference is required when the router and the middleware come from the same provider but you are being explicit, and it is required across providers. Getting it wrong yields a 404 from Traefik, not an auth failure.

Kubernetes CRD form, for completeness:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: blue-eyed
spec:
  forwardAuth:
    address: http://blue-eyed.blue-eyed.svc:8080/api/forward-auth
    trustForwardHeader: false
    authResponseHeadersRegex: "^X-Blue-Eyed-"
```

## Full option reference (v3.7)

Keys are identical across the file provider, Docker labels and the Kubernetes CRD, except where noted.

| Option | Type | Default | Since |
|---|---|---|---|
| `address` | string | required | v1.7 |
| `tls.ca` / `tls.cert` / `tls.key` / `tls.insecureSkipVerify` | string / string / string / bool | `""` / `""` / `""` / false | v2.x |
| `tls.caSecret` / `tls.certSecret` | string | | Kubernetes CRD only |
| `tls.caOptional` | *bool | | **removed in v3.0**; warns and is ignored on v2 |
| `trustForwardHeader` | *bool, tri-state | unset | v2.x, **deprecated v3.7.0 / v3.6.14** |
| `authResponseHeaders` | []string | `[]` | v2.0 |
| `authResponseHeadersRegex` | string | `""` | v2.4.0 |
| `authRequestHeaders` | []string | `[]` | v2.4.0 |
| `addAuthCookiesToResponse` | []string | `[]` | **v3.0.0** |
| `headerField` | string | `""` | **v3.2.0** |
| `forwardBody` | bool | false | **v3.3.0** |
| `maxBodySize` | *int64 | `-1`, unlimited | **v3.3.0** |
| `preserveLocationHeader` | bool | false | **v3.3.0** |
| `preserveRequestMethod` | bool | false | **v3.4.0** |
| `maxResponseBodySize` | *int64 | unset, unlimited | **v3.7.0**, backported v3.6.9 and v2.11.38 |
| `authSigninURL` | string | `""` | **v3.7.0** |

## v2 to v3

The migration guide names exactly one breaking ForwardAuth change:

> The `tls.caOptional` option has been removed from the ForwardAuth middleware, as well as from the HTTP, Consul, Etcd, Redis, ZooKeeper, Consul Catalog, and Docker providers.

Everything else is additive. That is the surprising part of this research: **the header and response semantics are the same in v2.11.55 and v3.7.11.** Traefik backported the whole `trustForwardHeader` tri-state model, `writeHeader` / `oldWriteHeader`, `DeleteXForwardedHeaders` with underscore handling, the allowlist filter, `forwardedPort`, and `maxResponseBodySize` into the v2 line as security fixes. The `[200,300)` condition, the `authResponseHeaders` del-then-set loop, and the regex strip-then-copy loops are byte-for-byte identical across the two branches.

What v3 has that v2 does not:

1. `forwardBody` and `maxBodySize`. v2 always sends a nil body.
2. `preserveRequestMethod`. v2 hardcodes GET.
3. `preserveLocationHeader`. v2 always absolutizes `Location` against the auth server URL, with no opt-out. Another reason to emit absolute URLs.
4. `addAuthCookiesToResponse`. v2 cannot propagate auth-server cookies on a 2xx at all.
5. `headerField` and the access-log `ClientUsername` integration.
6. `authSigninURL`.
7. The CONNECT unknown-length body guard.
8. Empty `User-Agent` suppression.
9. Context propagation, so a cancelled client yields 499 instead of 500.
10. OpenTelemetry tracing instead of OpenTracing.

Practical upshot: a blue-eyed forward-auth endpoint written against the contract above works on both major versions, as long as it emits absolute redirect URLs and does not depend on `forwardBody`, `preserveRequestMethod`, or cookie propagation on success.

## What this settles for blue-eyed

- The endpoint is a **GET with no body** at a fixed path. Design it that way. Do not plan on reading the request body.
- Reconstruct the original request from `X-Forwarded-Proto` + `X-Forwarded-Host` + `X-Forwarded-Uri`. That triple is the service identity for the coarse per-service authorization decision from #37, and `X-Forwarded-Uri` carries the query string we need to build a return URL.
- Session lookup uses the `Cookie` header, which arrives by default. Document that operators who set `authRequestHeaders` must include `Cookie`.
- **On a miss, return 302 with an absolute `Location` at blue-eyed's public origin.** This is the CSR bounce the map flags as a known tension. Traefik relays it untouched to the browser as long as it is absolute.
- Identity goes back on a 2xx under a single namespaced prefix, and our docs recommend `authResponseHeadersRegex: "^X-Blue-Eyed-"` so the whole namespace is stripped from client input whether or not we populate each header.
- Our 401/403 response bodies are shown to end users. Treat them as a UI surface.
- Set a minimum supported Traefik version. Given the advisory table, **v3.7.6 or v3.6.22** for the v3 line and **v2.11.51** for the v2 line.
