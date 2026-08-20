# Cross-domain forward-auth: prior art

Research for [#44](https://github.com/Eloquentia-Studios/blue-eyed/issues/44), part of the map in [#37](https://github.com/Eloquentia-Studios/blue-eyed/issues/37). Completed 2026-08-20.

Every project below was read from source at the tree that was current on that date, not from memory. Versions:

| Project | Version read | Commit / tag |
|---|---|---|
| Authelia | v4.39.20 | `main` @ `54917387` |
| oauth2-proxy | v7.15.4 | `81ff034f`, tagged the same day |
| authentik | 2026.8 line | `7cf061e` (2026-08-20) |
| tinyauth | v5.1.3 | `3e25c6af`, org moved to `tinyauthapp/tinyauth` |
| Pocket ID | v2.14.0 | `0bf0f392` |
| Pomerium | v0.32.x line | `961b0b0` |
| gogatekeeper | 4.11.0 | `c7c3d11` |
| Traefik | v3.7 line | `9bb0e55` (2026-08-20) |

## The answer, up front

Six of the seven projects punt on unrelated apex domains. Authelia, oauth2-proxy, authentik, tinyauth and gogatekeeper all require either a shared parent domain for single sign-on, or one auth instance per apex. Pocket ID does not implement forward-auth at all and says so in its docs. The maintainers of Authelia, oauth2-proxy and tinyauth have each written the same sentence in their own words: a server on `a.com` cannot write a cookie for `b.org`, so stop asking.

**Pomerium is the exception, and its mechanism is the one to copy.** It chains login redirects. After the identity handshake completes, the browser is bounced through `/.pomerium/callback/` on each additional protected host in turn, each hop carrying an encrypted session blob in the query string and setting that host's own cookie, until the chain ends at the originally requested URL. The config knob is `depends_on` on a route, capped at five extra hosts.

The second thing worth knowing is that the Traefik seam is friendlier than the docs suggest. On a non-2xx response Traefik copies the auth server's headers verbatim to the client, `Set-Cookie` included. That is what makes the redirect-and-mint pattern implementable behind ForwardAuth at all, and it is how authentik's outpost works today.

## 1. What the browser will and will not let us do

This is the part nobody gets to design around, so it goes first.

**A cookie's `Domain` must domain-match the host of the response that sets it.** RFC 6265bis section 5.7 step 10: "If request-host-canonical does not domain-match the domain-attribute: Abort this algorithm and ignore the cookie entirely." Step 9 blocks setting cookies on a public suffix. There is no header, no flag, no origin-trial that repeals this. One HTTP response can set cookies for exactly one registrable domain.

**`SameSite=Lax` is fine for a redirect-based flow, and is the right default.** Section 4.1.2.7 of the same draft: a Lax cookie "will be sent with same-site requests, and with 'cross-site' top-level navigations." Section 5.6.7.1 narrows that to top-level navigations using a safe method, so GET yes, POST no. Every project I read lands on Lax or on omitting the attribute and letting the browser default to Lax. Setting `Strict` breaks the callback, which is a filed, still-open oauth2-proxy bug ([#1663](https://github.com/oauth2-proxy/oauth2-proxy/issues/1663), open since 2022).

The "Lax-allowing-unsafe" carve-out that lets a recently-set cookie ride along on a cross-site POST is still in the draft (section 5.6.7.2) with the two-minute age limit, but it is a compatibility hack and I would not build on it. If we ever need a POST callback, `SameSite=None; Secure` is the honest answer. Pomerium does exactly that, and only for Apple, whose OAuth callback is a POST (`config/options.go:1454-1462`).

**Third-party cookies did not die, but they are dead enough.** Google reversed course on 2025-04-22: "we've made the decision to maintain our current approach to offering users third-party cookie choice in Chrome, and will not be rolling out a new standalone prompt for third-party cookies" ([Privacy Sandbox next steps](https://privacysandbox.google.com/blog/privacy-sandbox-next-steps)). Safari's ITP has blocked them outright since 2020 and Firefox's Total Cookie Protection has partitioned them by default since 2023. So a design that needs a third-party cookie works in Chrome and fails for every Safari and Firefox user. That is not a design, that is a bug report queue.

**CHIPS does not help.** A partitioned cookie's key "is the site (scheme and registrable domain) of the top-level URL the browser was visiting at the start of the request to the endpoint that set the cookie" and "when the user visits a new site, for example site B, an embedded C frame won't receive the cookie that was set when C was embedded in site A" ([CHIPS docs](https://privacysandbox.google.com/cookies/chips)). Partitioning by top-level site is precisely the thing we are trying to cross.

**Front-channel logout is broken and the spec admits it.** [OIDC Front-Channel Logout 1.0](https://openid.net/specs/openid-connect-frontchannel-1_0.html) works by the OP rendering "a dynamically constructed page with HTML `<iframe src="frontchannel_logout_uri">` tags", and the spec itself notes that "some User Agents (browsers) are starting to block access to third-party content by default." Those iframes need the RP's cookie in a third-party context. Safari and Firefox will not send it. Back-channel logout is server-to-server and works, but it needs the RP to hold a session the server can find, which for us means server-side sessions.

Everything in the rest of this document is a consequence of these five facts.

## 2. The Traefik ForwardAuth contract

Read from `pkg/middlewares/auth/forward.go` at `9bb0e55`. This is the seam blue-eyed has to fit, so the details matter more than usual.

**What Traefik sends.** By default the subrequest is a GET to the auth address with no body (`forward.go:161-166`; `preserveRequestMethod` and `forwardBody` change that). All client headers are copied wholesale (`writeHeader`, `forward.go:428-475`), then `X-Forwarded-For`, `-Method`, `-Proto`, `-Port`, `-Host` and `-Uri` are set, but only if not already present. `authRequestHeaders` is an allow-list applied to the copy, so setting it is how you stop the client's junk from reaching us.

**What the response means.** 2xx allows and the original request proceeds. Anything else and Traefik copies the auth server's headers and body to the client verbatim (`forward.go:285-312`):

```go
if forwardResponse.StatusCode < http.StatusOK || forwardResponse.StatusCode >= http.StatusMultipleChoices {
	utils.CopyHeaders(rw.Header(), forwardResponse.Header)
	utils.RemoveHeaders(rw.Header(), hopHeaders...)
	// ... Location handling ...
	rw.WriteHeader(forwardResponse.StatusCode)
	rw.Write(body)
```

That `CopyHeaders` on the deny path is the load-bearing detail for our design. **A 302 from the auth server carries its `Set-Cookie` all the way to the browser.** So the callback leg of a redirect-mint flow can run entirely inside a ForwardAuth subrequest: the proxy calls us, we see the callback path, we set the domain-local cookie and answer 302, and Traefik hands both to the client. authentik's outpost is built on exactly this.

On the allow path it is the opposite. Cookies we set on a 2xx are dropped unless the operator lists them in `addAuthCookiesToResponse`, and even then they are spliced into the *upstream's* response by a response modifier (`buildModifier`, `forward.go:367-386`), which also deletes any same-named cookie the backend tried to set. Useful for sliding session refresh, but it is opt-in operator config, so we cannot depend on it.

**`Location` gets rewritten by default.** `preserveLocationHeader` defaults to false, in which case Traefik calls `forwardResponse.Location()`, which resolves the header relative to the auth server's own URL (`forward.go:355-365`). A relative `Location: /login` becomes `http://blue-eyed:9091/login`, which is an internal address the browser cannot reach. Always emit an absolute `Location`. Authelia does; so does authentik.

**Header spoofing is the standing hazard, and Traefik's stance is explicit.** From `forward.go:314-319`:

> Only the operator-listed authResponseHeaders are stripped and replaced with the auth server's verified values. Any other header the client sends is forwarded to the backend unchanged [...] By design, Traefik asserts no identity the operator did not opt into: trusting unlisted client headers downstream is a backend misconfiguration, not a spoofing flaw here.

Traefik puts the burden on the operator. That is defensible for Traefik and terrible for us, because our users are homelabbers who will get it wrong. Every `Remote-*`-style header we emit must be in the operator's `authResponseHeaders` list or a client can inject it.

**Traefik's own 2026 ForwardAuth CVEs are a masterclass in how this goes wrong**, and they are recent enough that anyone deploying today should check their version:

| CVE | Sev | Root cause |
|---|---|---|
| [CVE-2026-33433](https://github.com/traefik/traefik/security/advisories/GHSA-qr99-7898-vr7c) | medium | `headerField` written with a non-canonical map key (`req.Header[b.headerField] = ...`), creating a second entry beside the attacker's canonical `X-Auth-User`. Backends read the attacker's. |
| [CVE-2026-39858](https://github.com/traefik/traefik/security/advisories/GHSA-5m6w-wvh7-57vm) | high | Underscore aliases. Sanitization targeted `X-Forwarded-Proto` and friends; `X_Forwarded_Proto` sailed through and backends that normalize `_` to `-` believed it. |
| [CVE-2026-35051](https://github.com/traefik/traefik/security/advisories/GHSA-6384-m2mw-rf54) | high | With `trustForwardHeader=false`, `X-Forwarded-Prefix` was neither stripped nor rebuilt, so an auth service keying on it could be steered. |
| [CVE-2026-54763](https://github.com/traefik/traefik/security/advisories/GHSA-x677-9fxg-v5c5) | high | Incomplete fix for the two above. Go's `Header.Del` canonicalizes `-` but not `_`, so underscore variants survived. Fixed by a new entry point option `allowHeadersWithUnderscores: false`. |
| [CVE-2026-54764](https://github.com/traefik/traefik/security/advisories/GHSA-3q9r-p662-5j8m) | medium | Incomplete fix again. `X-Forwarded-Port` was derived from the *original* request rather than the sanitized one, so `X-Forwarded-Proto: https` over plain HTTP yielded `X-Forwarded-Port: 443` to the auth service. |

Five CVEs, three of them incomplete fixes for each other, all in one twenty-line function. The lesson is not "Traefik is bad." The lesson is that header-derived trust is genuinely hard to get right, and any authorization decision we make from `X-Forwarded-*` inherits every one of these bugs.

There is one more knob worth noting. `authSigninURL` (`forward.go:274-281`) makes Traefik itself issue a 302 when the auth server returns 401, without the auth server saying where to go. It is a static URL, so it cannot carry a per-request return target. Not useful to us.

## 3. Project by project

### Authelia: multi-domain, explicitly not multi-domain SSO

Authelia's `session.cookies` list (v4.38+) lets one instance protect several unrelated apexes. It does not share a session between them. The release notes say so without hedging:

> This release sees the initial implementation of multi-domain protection. [...] **This does not allow single sign-on between these distinct domains.** When surveyed users had very low interest in this feature and technically speaking it's not trivial to implement such a feature as a lot of critical security considerations need to be addressed.

The [roadmap page](https://www.authelia.com/roadmap/active/multi-domain-protection/) still shows "SSO Implementation: not started" as of today.

The code backs this up. `internal/session/provider.go:38-49` builds an independent session holder per configured domain, each with its own cookie name, store handle and session ID. `internal/handlers/handler_authz_authn.go:108-120` destroys any session whose recorded `CookieDomain` does not match the domain resolved from the request, logging it as "a sign a user tried to move this cookie from one domain to another." The validator refuses two cookie domains where one is a suffix of the other.

Lead maintainer James Elliott on [#1198](https://github.com/authelia/authelia/issues/1198), which ran from 2020 to 2023:

> The issue is that as auth.example1.com you **cannot** read OR write a cookie for example2.com or auth.example2.com. It's literally a baked in standard of the web.

He rejected the iframe-plus-`postMessage` workaround on the grounds that Authelia deliberately blocks itself in iframes. He did sketch the right answer in 2021: a designated primary domain, authenticate there, redirect to `auth.example2.com` with an Authelia-signed JWT, write the linking cookie. It was never built.

An under-advertised consequence: **WebAuthn credentials do not cross either.** The relying party ID is `origin.Hostname()` at runtime (`internal/middlewares/authelia_context.go:753`) and credentials are queried filtered by RPID (`internal/storage/sql_provider.go:864`). A passkey registered at `auth.a.com` is invisible at `auth.b.org`. The 4.38 notes admit "This feature at the time of this writing, will not work well with WebAuthn."

Flow mechanics worth stealing. The forward-auth endpoint is `/api/authz/forward-auth`. On a miss with a cookie session it redirects to `<authelia_url>/?rd=<target>&rm=<method>`, using 302 for GET/HEAD/OPTIONS, 303 otherwise, and 401 when the request is XHR or does not accept `text/html` (`handler_authz_util.go:58-69`). Returning 401 to XHR instead of a redirect is a small thing that will matter a lot for our CSR frontend.

The `rd` value is not validated at redirect time. It is validated when the portal acts on it after login, via `IsSafeRedirectionTargetURI`, which requires HTTPS and that the target fall inside *some* configured cookie domain (`authelia_context.go:286-297`). `HasDomainSuffix` requires an exact match or a `.domain` suffix, so `evilexample.com` does not match `example.com`. That dot boundary is the whole defence and it is easy to get wrong.

Cookie attributes, from `internal/session/provider_config.go` and fasthttp/session v2.5.9: `Secure` hardcoded true via an `IsSecureFunc` stub that just returns true, `HttpOnly` hardcoded true in the library, `Path` hardcoded `/`, `SameSite` configurable with `lax` default, expiry 1h default or 30d with remember-me, plus a server-side 5-minute inactivity timeout. The cookie holds only a session ID; everything else is server-side in memory or Redis. Redis payloads get AES-GCM; in-memory ones are plaintext on the heap.

Revocation runs off `authentication_backend.refresh_interval`, default 5 minutes. `refresh_interval: 'always'` gets you near-zero latency at one directory lookup per authz request; `'never'` means a disabled user keeps access until their cookie expires, and there is no admin API to kill sessions. Worth noting that a transient backend error other than "user not found" returns "still valid" (`handler_authz_authn.go:542-544`), so an LDAP outage fails open for existing sessions.

Logout calls `DestroySession()` exactly once, against the provider resolved from the current request's own forwarded URL. There is no loop over the cookie list anywhere in the destroy path. Logging out at `auth.a.com` leaves `b.org` fully signed in. A cosmetic wrinkle: the clearing `Set-Cookie` omits `Domain` entirely, so the stale domain-scoped cookie survives in the browser. Harmless, because the server-side record is already gone, but it will burn an hour of somebody's debugging time.

The operational trap: **Authelia has no trusted-proxy allowlist.** `RequestCtxRemoteIP` (`internal/middlewares/wrap.go:32-44`) takes the leftmost `X-Forwarded-For` unconditionally, and the target URL comes straight from `X-Forwarded-Proto`/`-Host`/`-URI`. Their [docs](https://www.authelia.com/integration/proxies/forwarded-headers/) make it the proxy's job and call out that Cloudflare *appends* to XFF rather than replacing it, so "a client can forge their remote IP address with the most widely accepted remote IP header out of the box."

### oauth2-proxy: no, and `--cookie-domain` does not mean what people think

Maintainer JoelSpeed on [#1944](https://github.com/oauth2-proxy/oauth2-proxy/issues/1944):

> what you're trying to achieve is not possible. You must access OAuth2 Proxy on a similar domain to the domain you are trying to protect, you can't cross from `acme.com` to `example.com`

and on the Helm chart's multi-domain example that misled the reporter:

> The multiple cookie domains allows the proxy to create cookies that are tied to the best matched cookie domain path, but, you can't set multiple domains on a cookie.

`GetCookieDomain` (`pkg/cookies/cookies.go:61-69`) is a plain `strings.HasSuffix` first-match over a list sorted longest-first. All a multi-value list buys you is picking the right scope per host. On no match it does not fail; it picks the *shortest* domain and logs an error (`cookies.go:30-36`), which produces a `Set-Cookie` the browser rejects and an infinite redirect loop. That fallback is the root of most "Unable to find a valid CSRF token" reports.

Also note `GetCookieDomain` uses bare `HasSuffix` with no dot boundary, so cookie domain `example.com` matches host `badexample.com`. The redirect validator got that exact bug fixed as CVE-2021-21291; the cookie-domain path never did.

The pattern that does work for unrelated apexes on one deployment: leave `--redirect-url` unset so the callback host is derived per request from `Host`/`X-Forwarded-Host` (`oauthproxy.go:1113-1136`), route `/oauth2/*` on every protected domain, and register every callback URI at the IdP. That gives a separate session per domain plus IdP-mediated silent re-auth on each one, not shared session state. Honest framing for anyone who asks for "cross-domain SSO with one oauth2-proxy": you get a redirect flash and a fresh authorization-code round trip on every apex, and it stops looking like SSO the moment the IdP wants consent, MFA step-up or `prompt=login`.

`state` is **not signed and not encrypted by default**. It is `fmt.Sprintf("%v:%v", nonce, redirect)`, base64'd only if `--encode-state` is set, which defaults to false (`oauthproxy.go:1282-1305`). Integrity comes entirely from the CSRF cookie, which is msgpack, AES-CFB encrypted, HMAC-SHA256 signed, holding the raw nonces while only their hashes travel in `state`. The redirect half of `state` is re-validated through `IsValidRedirect` on the way back, so tampering with it is pointless. This is a reasonable design that reads as sloppy at first glance, which is itself a lesson about writing things down.

One ordering quirk: the callback redeems the code at the IdP *before* checking the CSRF state (`oauthproxy.go:885-977`). A forged callback still burns a code exchange.

Cookies: `Secure` and `HttpOnly` both default true; `SameSite` defaults to `""`, meaning the attribute is omitted and the browser applies its own default. Sessions default to 168 hours. The cookie carries the full access token, ID token and refresh token, msgpack + LZ4 + AES-CFB, which is why deployments with Entra ID blow past 4KB and get split into `_0`, `_1` chunks with a warning telling them to use Redis. nginx `auth_request` only copies the first `Set-Cookie` from a subrequest, so chunking is an operational trap there.

Revocation: **seven days by default.** `--cookie-refresh` defaults to 0, which makes `needsRefresh` always false, which means `validateSession` never runs (`pkg/middleware/stored_session.go:244-246`). A user deleted at the IdP keeps access until the cookie's embedded timestamp expires. Redis does not change this on its own; it changes what you can delete out of band. Since v7.15.2 a refresh error containing `invalid_grant` or `invalid_client` is fatal and clears the session.

Logout is per-domain and per-cookie-scope, full stop. `--backend-logout-url` is a server-side `http.Get` whose failures are logged and ignored. The docs are blunt: "This endpoint only removes oauth2-proxy's own cookies, i.e. the user is still logged in with the authentication provider."

### authentik: two modes, and the multi-app one needs a shared parent

authentik's proxy provider has [two forward-auth modes](https://github.com/goauthentik/authentik/blob/main/website/docs/add-secure-apps/providers/proxy/forward_auth.mdx), and the docs draw the line cleanly:

> **Single application.** Single-application mode works for one application hosted on its own domain or subdomain. [...] only `/outpost.goauthentik.io` on the application domain is routed to the authentik outpost.
>
> **Domain level.** Domain-level mode works for multiple applications **under the same parent domain**. Set **Authentication URL** to the URL used for authentication, and **Cookie domain** to the parent domain shared by the protected applications.

So: SSO across apps requires a shared parent. Unrelated apexes need one provider and one reserved path per domain.

The single-application mechanism is the closest working prior art to what blue-eyed needs, and it is worth reading in full because it threads the Traefik seam exactly the way I described in section 2.

The reserved path is `/outpost.goauthentik.io` on the protected domain. The outpost's Traefik handler rebuilds the original URL from `X-Forwarded-Proto` + `X-Forwarded-Host` + `X-Forwarded-Uri` (`mode_common.go:97-109`), then checks for a **query-string signature** rather than a path:

```go
// internal/outpost/proxyv2/application/mode_forward.go:42-50
if strings.EqualFold(fwd.Query().Get(CallbackSignature), "true") {
	a.handleAuthCallback(rw, tr)
	return
} else if strings.EqualFold(fwd.Query().Get(LogoutSignature), "true") {
	a.handleSignOut(rw, r)
	return
}
```

`CallbackSignature` is `X-authentik-auth-callback` (`oauth.go:15`). The callback handler redeems the code, saves the session (which writes `Set-Cookie` for the protected domain) and 302s. Because a 302 is not 2xx, Traefik copies both the cookie and the `Location` to the browser. That is the whole trick.

The `state` is an **HS256 JWT signed with the provider's cookie secret**, carrying `{iss, sid, state, redirect}` (`oauth_state.go:17-22`). On return it is validated three ways: the algorithm must be HMAC, the issuer must equal `goauthentik.io/outpost/<client_id>`, and `claims.SessionID` must equal the current session's ID on the protected domain (`oauth_state.go:107-151`). That session binding is the anti-fixation and anti-CSRF measure, and it is a good one.

Two things I would not copy. First, **the state JWT has no expiry**: `GetExpirationTime` returns `nil, nil` (`oauth_state.go:24`). Its only time bound is the lifetime of the pre-auth session cookie. Second, the domain-level redirect check is a bare suffix match:

```go
// internal/outpost/proxyv2/application/oauth_state.go:62-65
if !strings.HasSuffix(u.Hostname(), *a.proxyConfig.CookieDomain) {
	// reject
}
```

No dot boundary. With `CookieDomain = example.com`, the host `evilexample.com` passes. The single-application branch above it does the right thing (exact host equality against `ExternalHost`), which makes the inconsistency look like an oversight rather than a decision.

Cookies: `HttpOnly` true, `Secure` when the external host is https, `Domain` from the provider config, `SameSite` Lax, `Path` `/`, `MaxAge` derived from the ID token's `exp` (`session.go:44-71`). Sessions are server-side, in a filesystem or Postgres store.

Logout is the interesting bit. `handleSignOut` (`application.go:294-312`) calls `a.Logout(ctx, func(c types.Claims) bool { return c.Sub == cc.Sub })`, which deletes **every session in the outpost's store with the same subject**, then redirects to the OP's `end_session_endpoint`. It cannot delete the cookies sitting in the browser for other domains, so it does the next best thing: it kills the server-side records those cookies point at. The stale cookies become dead references and get cleared on next use. **This is the design answer to "logout cannot reach cross-domain cookies."** Keep sessions server-side, key them by user, delete by user.

Relevant authentik advisories:

- [CVE-2026-25748](https://github.com/goauthentik/authentik/blob/main/website/docs/security/cves/CVE-2026-25748.md): forward-auth bypass with a malformed session cookie on Traefik and Caddy. A malicious cookie caused none of the `X-Authentik-*` headers to be set, and applications that gate on header presence let the attacker straight in. No workaround; upgrade or disable forward auth. Two lessons: a malformed credential must deny, not degrade, and header-absence must never be the only thing standing between a user and an app.
- [CVE-2025-64708](https://github.com/goauthentik/authentik/blob/main/website/docs/security/cves/CVE-2025-64708.md): invitations were valid regardless of expiry because cleanup ran on a 5-minute background task. Directly relevant, since blue-eyed's onboarding is invitation links. Check expiry at redemption time, do not rely on a reaper.
- [CVE-2025-29928](https://github.com/goauthentik/authentik/blob/main/website/docs/security/cves/CVE-2025-29928.md): deleting a session did not revoke it under database session storage, including the automatic deletion when a user is deactivated. Revocation you never tested is revocation you do not have.

### tinyauth: forward-auth, one parent domain, closed by stale bot

tinyauth is the closest project to blue-eyed in spirit and the most direct evidence about this problem. Its forward-auth endpoint is `/api/auth/{traefik,caddy,envoy,nginx}` and everything hangs off a single `appUrl`.

`utils.GetCookieDomain` (`internal/utils/app_utils.go:60-94`) strips exactly one label and checks the result against the public suffix list. `appUrl = https://auth.example.com` gives `CookieDomain = example.com`. Note it strips one label rather than reducing to the registrable domain, so `auth.internal.example.com` yields `internal.example.com` and apps at `app.example.com` fall out of scope. That is the root cause of [#558](https://github.com/tinyauthapp/tinyauth/issues/558).

The constraint is enforced twice. Cookie scope is one gate; `isRedirectSafe` (`internal/controller/oauth_controller.go:295-338`) is the other, refusing to redirect back to any host outside `CookieDomain`. Even if you solved the cookie you would hit the redirect check.

Maintainer @steveiliop56 on [#65](https://github.com/tinyauthapp/tinyauth/issues/65), 2025-06-06:

> Unfortunately no. I had an idea on how to implement it but I ended up not liking it and toasted it. [...] I cannot think of a good idea on how to implement this because you will need to have tinyauth exposed on multiple domains which is not really practical. I think the best way going forward is to have a tinyauth instance per domain.

He is diagnosing it correctly and stopping one step short. Exposing the auth service on each protected domain and running a handshake per domain *is* the answer; it is what Pomerium does. It feels impractical inside tinyauth because everything was collapsed onto one `appUrl` early and now every cookie, redirect check and OIDC issuer reads from that value. The constraint is architectural, not physical. The issue was closed by the stale bot on 2025-08-23, not resolved, and there is no open replacement.

Things worth copying from tinyauth:

- **Domain-suffixed cookie names.** The runtime name is `tinyauth-session-<id>` where the id derives from the domain ([PR #161](https://github.com/tinyauthapp/tinyauth/pull/161)). It exists so two instances on sibling subdomains do not clobber each other. If we ever recommend one instance per apex, we need this. Pocket ID hit the same class of bug in its [#171](https://github.com/pocket-id/pocket-id/issues/171).
- **Public-suffix check before setting a cookie `Domain`.** Guards the supercookie mistake. It also produces a real failure for homelabbers on `duckdns.org` and on private TLDs like `.home`, which the docs do call out.
- **Opaque UUID session backed by a DB row**, with sliding expiry (extends by an hour when used in its last hour) and a separate hard `SessionMaxLifetime`. Forward auth hits the DB every request anyway, so revocation is free.
- **Re-validating identity on every request** rather than trusting the stored row. LDAP sessions re-fetch groups, OAuth sessions re-check the email allow-list and delete the session on failure.
- **Browser detection on the deny path.** `useBrowserResponse` checks the User-Agent and gives browsers a 302 while API clients get a 401 with an `x-tinyauth-location` header (`proxy_controller.go:350-363`). Same idea as Authelia's XHR check, different heuristic. Ours should key on `Accept`, not User-Agent.

Things not to copy: `secureCookie` defaults to `false`, which for a cookie scoped to a whole parent domain is too loose.

The community workaround, from @danktankk in #65:

> I am just using 3 different tinyauth containers currently. One for each domain I want covered. All 3 of these forward to one instance of pocketid. works without any issues.

Pocket ID as the single identity source holding the passkeys, N tinyauth instances one per apex. That is the current state of the art in the self-hosted world, and it works because the only thing crossing a domain boundary is an OIDC redirect while the only thing staying local is a cookie.

### Pocket ID: no forward-auth, deliberately

Worth including precisely because it punts, and because it punts for reasons that constrain us.

From [the docs](https://pocket-id.org/docs/guides/proxy-services):

> The goal of Pocket ID is to function exclusively as an OIDC provider. As such, we don't have a built-in proxy provider.

Two feature requests, [#241](https://github.com/pocket-id/pocket-id/issues/241) and [#498](https://github.com/pocket-id/pocket-id/issues/498), were closed within 72 hours and 24 hours respectively. Maintainer @stonith404: "As Pocket ID is solely an OIDC provider I don't think this makes sense [...] the goal of Pocket ID is to stay simple."

Its session cookie is `__Host-access_token`. The `__Host-` prefix means the browser *forbids* a `Domain` attribute, so the session is host-only by browser enforcement rather than by application logic. That is a strong choice and it makes cookie-sharing structurally impossible without renaming the cookie. Attributes are SameSite=Lax, Secure, HttpOnly, Path `/`, 60-minute default. The cookie holds a **stateless signed JWT**, verified by signature plus `aud`/`iss` both equal to `AppURL`, with no database lookup. Consequences: no refresh, no sliding expiry, and **no revocation**. Logout clears the browser cookie and nothing else. A stolen token stays valid for up to an hour.

The passkey constraint is the one that binds us too. RP ID is `utils.GetHostnameFromURL(deps.AppURL)` with a single-entry origin list (`backend/internal/webauthn/service.go:42-44`). Maintainer, closing [#1700](https://github.com/pocket-id/pocket-id/issues/1700) on 2026-08-18:

> It's impossible to allow multiple domains since passkeys are bound to a single domain.

The pushback in [#1067](https://github.com/pocket-id/pocket-id/issues/1067) from @Patricol is fair and worth reading:

> If I have to host 3 separate copies of Pocket ID to stop it from erroring when used from more than one URL, that means every user needs to maintain 3 separate sets of passkeys across all of their devices [...] It's a design flaw that should be kept on the backlog; not closed as unplanned.

Both sides are right. The escape hatch nobody in that thread names is that RP ID may be a registrable suffix of the origin, so a credential scoped to `example.com` works at both `auth.example.com` and `login.example.com`. That buys multiple hostnames under one registrable domain and nothing across two apexes. Pocket ID does not expose the knob.

**This is a hard constraint on blue-eyed.** Passkeys are our primary credential and WebAuthn RP IDs cannot span apexes. Whatever we build, the login ceremony happens on exactly one hostname and everything else is a redirect back from it. That is not a limitation of our design, it is the shape the design has to take.

### gogatekeeper: per-service sidecar, callback derived from the forwarded host

Keycloak Gatekeeper was deprecated, forked to Louketo Proxy, and Louketo was archived on 2020-12-07. The [Keycloak announcement](https://www.keycloak.org/2020/08/sunsetting-louketo-project.adoc), 2020-08-21, is short:

> OAuth2 Proxy is very close in a set of capabilities to Louketo Proxy and we highly suggest you investigate it as a replacement.

The stated reason was that the plan to merge with oauth2-proxy failed and maintaining a duplicate was not worth it. A community fork lives on as [gogatekeeper/gatekeeper](https://github.com/gogatekeeper/gatekeeper), actively maintained, currently 4.11.0.

Its design is the per-service sidecar: one gatekeeper per protected app, reserved path prefix `/oauth` (`--oauth-uri`, default `/oauth`), with `/oauth/callback`, `/oauth/login`, `/oauth/logout`, `/oauth/expired`. Cookies are `kc-access` (access token) and `kc-state` (refresh token), plus `request_uri`, `OAuth_Token_Request_State`, `pkce` and `id_token`. Attributes come from a shared manager (`pkg/proxy/cookie/cookies.go:47-91`): `Domain` from config or empty, `Path` `/`, `SameSite` configurable with `Lax` default, `Secure` and `HttpOnly` configurable. Oversized cookies are chunked into `name-1`, `name-2` (`dropCookieWithChunks`, `:302-330`).

It also runs in forward-auth mode with `--no-proxy`, and this is where it gets relevant. In that mode the config validator **forbids** setting `--redirection-url` (`ErrRedundantRedirectURIinForwardAuthMode`, `config.go:735-737`), because the redirect URI is derived per request:

```go
// pkg/proxy/handlers/handlers.go:210-212
if (noProxy && !noRedirects) || enableXForwardedHeaders {
	scheme = req.Header.Get(constant.HeaderXForwardedProto)
	host = req.Header.Get(constant.HeaderXForwardedHost)
}
// ...
return fmt.Sprintf("%s%s", redirect, withOAuthURI(constant.CallbackURL))
```

So the OIDC `redirect_uri` is `<X-Forwarded-Proto>://<X-Forwarded-Host>/oauth/callback`, built from client-controllable headers. The only thing stopping that from being a token-leak primitive is that Keycloak validates `redirect_uri` against the client's registered list, so every protected domain's callback must be registered at the IdP and nothing else works. That is a real mechanism for multi-domain, and it puts the security burden entirely on the IdP's redirect allow-list.

Two details I like. The post-login return target lives in a **cookie** (`request_uri`, base64, `cookies.go:189`) rather than in `state` or the query string, so it is first-party data an attacker cannot supply. And `state` from the query is compared against the `OAuth_Token_Request_State` cookie before use (`handlers.go:238-246`). Both are cheap and both close real holes.

Its documented vulnerabilities, from the repo's own `SECURITY.md`:

- **Impersonation, fixed in 2.9.3**, inherited from louketo-proxy. "User could forge access token and in case he has access to valid refresh token of other person he can gain access to other person access token. This was caused by not explicitly calling validate signature method but by calling external library method which validates several properties at once but which doesn't do it in correct order." Deployments with `--enable-encrypted-token`, a Redis store, or `--enable-idp-session-check` were unaffected.
- **CVE-2020-14359, fixed in 1.4.0.** Default-deny applied only to uppercase HTTP methods, so a lowercase method sailed past. Jetty accepts lowercase methods.

Both are the same shape: an authorization decision made on a value that had more than one valid representation.

### Pomerium: the one that actually does it

Pomerium solves cross-apex login by **chaining redirects and minting a cookie at each hop.** The feature is documented as [Additional Login Redirect Hosts](https://www.pomerium.com/docs/reference/routes/additional-login-redirect-hosts), the config key is `depends_on`, and it landed in v0.30.

```yaml
routes:
  - from: https://my-app.example.com
    to: https://my-app-server.internal.domain
    depends_on:
      - api.my-app.example.com
      - assets.my-app.example.com
```

Capped at five extra hosts, validated at config load (`config/policy.go:807-816`), and it "cannot be used in combination with the Cookie Domain setting."

The flow, traced through the source:

1. **Deny.** The authorize service returns a 302 whose `Location` is a sign-in URL, and it passes the route's `depends_on` list along (`authorize/check_response.go:308-313`).
2. **Sign-in URL.** `urlutil.SignInURL` (`internal/urlutil/known.go:100-125`) builds `<authenticate>/.pomerium/sign_in` with query params `pomerium_redirect_uri`, idp id, version, a request UUID, and issued/expiry timestamps, then **HPKE-encrypts the whole query string** to the authenticate service's public key. Expiry is `signInExpiry = 5 * time.Minute` (`known.go:24`).
3. **Identity handshake** at the authenticate service.
4. **Callback URL.** `urlutil.CallbackURL` (`known.go:35-87`) builds the return URL. If no explicit callback was given it takes the redirect target's host and sets the path to `/.pomerium/callback/`. Query params carry the redirect URI, the full `identity.Profile` as protojson, version, and issued/expiry, HPKE-encrypted to the *proxy's* public key this time.
5. **Per-hop cookie.** At `/.pomerium/callback/` the proxy decrypts, writes the session handle (`WriteSessionHandleJWT`), and then:

```go
// internal/authenticateflow/stateful.go:757-772
// Redirect chaining for multi-domain login.
additionalHosts := r.URL.Query().Get(urlutil.QueryAdditionalHosts)
if additionalHosts != "" {
	nextHops := strings.Split(additionalHosts, ",")
	callbackURL, err := urlutil.GetCallbackURL(r, encryptedSession, nextHops[1:])
	callbackURL.Host = nextHops[0]
	signedCallbackURL := urlutil.NewSignedURL(s.sharedKey, callbackURL)
	httputil.Redirect(w, r, signedCallbackURL.String(), http.StatusFound)
	return
}
httputil.Redirect(w, r, redirectURL.String(), http.StatusFound)
```

Each hop pops the head off the host list, rewrites the callback URL's host, HMAC-signs it with the shared key, and 302s. The next host's proxy sets its own cookie and repeats. When the list empties, the final redirect goes to the originally requested URL.

**Token contents and lifetime.** The session material in the URL is the session handle JWT, encrypted with the deployment's shared cipher and base64url-encoded into `pomerium_session_encrypted`. The URL as a whole is HMAC-signed with `pomerium_issued`, `pomerium_expiry` and `pomerium_signature` (`internal/urlutil/signed.go:30-42`). Both the HPKE query params and the signed URLs get a **5-minute** validity window, with `DefaultLeeway` of 1 minute for clock skew (`internal/urlutil/url.go:17`, `internal/urlutil/time.go:19-43`).

**Replay prevention is time-bounded, not nonce-bounded.** `Validate` checks issued, expiry and HMAC. There is no one-time-use marker and no server-side record of consumed callbacks. Anyone who observes the URL inside the five-minute window can replay it and get the session cookie on their own browser. Referer leakage, proxy logs and browser history are all in scope. Pomerium is a Layer-7 gateway where every hop is its own trusted proxy, which softens this, but for blue-eyed I would add a single-use nonce checked against the store. It is cheap and we already have SQLite.

**Cookie attributes** (`config/options.go:1546-1555`): `Secure` hardcoded true, `HttpOnly` defaults true, `Expires` from `cookie_expire` defaulting to 14h, `SameSite` defaults to `SameSiteDefaultMode` which omits the attribute and lets the browser apply Lax. The one interesting special case is `GetCSRFSameSite` returning `None` for Apple, whose OAuth callback is a POST that Lax would block (`options.go:1454-1462`).

**Pomerium's CVEs are the ones to read**, because they are the failure modes of exactly the design we would be copying:

- **[CVE-2021-29651](https://github.com/pomerium/pomerium/security/advisories/GHSA-35vc-w93w-75c2)**, JWT leak via open redirect in programmatic access. "one can get a signed login URL with pomerium_redirect_uri set to an arbitrary URL. Then, if the user has already logged into Pomerium, they will be redirected to the specified pomerium_redirect_uri with a JWT attached." The advisory notes the follow-on: an app that checks only `iss` and not `aud` can be accessed as the victim. **Putting credentials in a URL means the redirect allow-list is the only thing between you and credential exfiltration.**
- **[CVE-2021-29652](https://github.com/pomerium/pomerium/security/advisories/GHSA-fv82-r8qv-ch4v)**: "Some API endpoints under /.pomerium/ do not verify parameters with pomerium_signature." A signature scheme that some handlers forget to check.
- **[CVE-2026-50285](https://github.com/pomerium/pomerium/security/advisories/GHSA-ggw3-5987-rx77)** (high, fixed v0.32.8): unbounded zstd decompression in the HPKE decode path. "the proxy's `/.pomerium/callback` endpoint is reachable without credentials and processes attacker-crafted HPKE-encrypted payloads before the sender's identity is validated." A decompression bomb crashes the proxy. **A reserved callback path on every protected domain is a pre-auth attack surface on every protected domain.** Bound every input you parse there.

## 4. Comparison

### Cross-apex support

| Project | Unrelated apexes? | Mechanism | SSO across them? |
|---|---|---|---|
| Authelia | Protect yes, SSO no | Independent session per cookie domain | No. Roadmap says "not started" |
| oauth2-proxy | Yes with per-domain callbacks | Per-request callback host from `X-Forwarded-Host` | No. IdP-mediated silent re-auth only |
| authentik (domain mode) | No | Shared cookie domain | Yes, within one parent domain |
| authentik (single-app mode) | Yes | Reserved path + callback inside the ForwardAuth subrequest | No. One provider per domain |
| tinyauth | No | One `appUrl`, one derived cookie domain | Within one parent domain only |
| Pocket ID | N/A | No forward-auth at all | N/A |
| gogatekeeper | Yes | `redirect_uri` derived from `X-Forwarded-Host`, one sidecar per service | No. Relies on the IdP session |
| **Pomerium** | **Yes** | **`depends_on` redirect chain, HPKE + HMAC-signed callback per hop** | **Yes** |

### Cookie attributes

| Project | Secure | HttpOnly | SameSite | Path | Default lifetime | Cookie contents |
|---|---|---|---|---|---|---|
| Authelia | always true | always true | `lax` (configurable) | `/` hardcoded | 1h, 30d remember-me, 5m inactivity | session ID only |
| oauth2-proxy | true | true | omitted (browser Lax) | `/` | 168h | full access + ID + refresh tokens |
| authentik | https-dependent | true | Lax | `/` | ID token `exp` | session ID |
| tinyauth | **false by default** | true | Lax | `/` | 24h sliding | session UUID |
| Pocket ID | true (`__Host-`) | true | Lax | `/` | 60m | signed JWT |
| Pomerium | always true | true | omitted (browser Lax) | `/` | 14h | session handle |
| gogatekeeper | configurable | configurable | `Lax` default | `/` | token lifetime | access + refresh tokens |

The pattern is unanimous. Lax or omitted, `Path=/`, `HttpOnly`. Nobody uses `Strict`, because it breaks the callback. Two are stateless JWT or token cookies and both pay for it in revocation.

### Revocation latency

| Project | Default | Best case | Worst case |
|---|---|---|---|
| Authelia | 5 min (`refresh_interval`) | ~0 with `refresh_interval: always` | never, with `refresh_interval: never` |
| oauth2-proxy | **7 days** | `--cookie-refresh` period | 7 days |
| authentik | server-side, immediate on delete | immediate | see CVE-2025-29928 |
| tinyauth | immediate (DB row per request) | immediate | immediate |
| Pocket ID | **none** | n/a | token expiry, 60 min |
| gogatekeeper | token lifetime | `--enable-idp-session-check` | refresh token lifetime |

Server-side sessions win outright here, and forward-auth already pays for a lookup on every request, so there is no performance argument for the stateless variant.

## 5. Failure modes, grouped

Ten of the vulnerabilities I read fall into five recurring shapes. These are the things to design against.

**One value, several representations.** The single most common bug in the set.

- Traefik CVE-2026-33433: `X-Auth-User` written with a non-canonical map key, leaving the attacker's canonical entry in place.
- Traefik CVE-2026-39858 and CVE-2026-54763: `X_Forwarded_Proto` surviving sanitization that only matched `X-Forwarded-Proto`, because Go canonicalizes `-` but not `_`.
- oauth2-proxy CVE-2025-64484: the same underscore trick against `X_Forwarded_Email`.
- gogatekeeper CVE-2020-14359: default-deny applied to `GET` but not `get`.
- Authelia CVE-2026-48794: an access-control rule missed because the host was `a.B.example.com` and nothing lowercased it.
- tinyauth GHSA-328g-jx67-v94g: ACL lookup by host with a case-sensitive `==`.

Rule: canonicalize every input before any comparison, and canonicalize once, at the edge.

**Redirect targets.** The classic, and it never stops.

- oauth2-proxy CVE-2020-5233, CVE-2020-11053, CVE-2020-4037: `/\evil.com`, `/ /evil.com`, `/\t\\evil.com`, `/./../../\evil.com`. Three rounds of regex patching. Today's pattern is `[/\\](?:[\s\v]*|\.{1,2})[/\\]` and the test table enumerates specific tab and newline mixtures rather than trusting it.
- oauth2-proxy CVE-2021-21291: `--whitelist-domain=.example.com` also matched `badexample.com` because the leading dot was trimmed before the suffix check.
- Pocket ID CVE-2026-28512: `https://legit.example.com@evil.tld/` beating a delimiter-based match. Fixed by replacing delimiter matching with structured URL comparison.
- Pocket ID CVE-2026-55834: the allow-list lived in the backend, but the SvelteKit frontend called `window.location.href` with the raw `redirect_uri` before the backend was ever consulted. The backend correctly returned 401. The browser had already left.
- Authelia CVE-2021-29456: logout honoured an arbitrary redirect target.
- Pomerium CVE-2021-29651: arbitrary `pomerium_redirect_uri` plus a JWT in the URL equals credential exfiltration.

Rules: parse, never string-match. Compare parsed hosts with an explicit dot boundary. Enforce the allow-list on the code path that performs the redirect, not in a layer the caller can skip. And if a credential rides in the URL, treat the allow-list as a credential boundary rather than a UX nicety.

**Path matching for skip rules.** oauth2-proxy has three CVEs here in two years, all from `skip_auth_routes` matching something other than the true normalized path: CVE-2025-54576 (matched the full URI including query, so `/foo/critical?param=/bar` passed a `^/foo/.*/bar$` rule), CVE-2026-41059 (`#` fragment confusion), CVE-2026-40575 (matched a spoofable `X-Forwarded-Uri`). tinyauth GHSA-r27r-rr9v-vv37 is the same bug from a different direction: a config field documented as "a list of paths" was compiled as an unanchored regex and matched against the raw URI, so `/admin?x=/allowed` returned 200.

Rules: strip the query and fragment, normalize the path, anchor the match, and do not silently turn a path list into a regex. Better: **blue-eyed's authorization is coarse and per-service by charter, so we should not have path skip rules at all.** That entire CVE class is one we can decline to participate in.

**Failing open.** tinyauth GHSA-328g-jx67-v94g is the sharpest example: an ACL lookup miss returned an empty `config.App{}` with no error, and an empty `users.allow` means "allow everyone." The case-sensitivity was just the trigger; the bug was that a miss produced a permissive default. Authelia CVE-2021-32637 is the same shape from the other end: an unparseable target URL called `ctx.Error(...)`, which returned 200, which nginx's `auth_request` reads as "authenticated." authentik CVE-2026-25748 too: a malformed cookie meant no `X-Authentik-*` headers, and apps gating on header presence let the request through. And Authelia's directory-backend refresh returns "still valid" on any error other than "user not found," so an LDAP outage keeps disabled users alive.

Rules: a lookup miss is an error and an error denies. Never let a parse failure reach a success status code. Test the 500 path.

**Replay and session binding.** authentik's state JWT has no `exp` and relies solely on the session-ID binding. Pomerium's callback URLs are replayable for five minutes by anyone who sees them. oauth2-proxy redeems the authorization code before checking CSRF state, so a forged callback still burns a code. Pocket ID's stateless JWT cannot be revoked at all. gogatekeeper's pre-2.9.3 impersonation bug came from calling a library helper that validated several properties in the wrong order instead of checking the signature explicitly.

Rules: bind the minted artifact to a pre-existing session ID on the target domain, give it a short absolute expiry, and mark it consumed server-side on first use. Validate the signature before you read the claims, and do it yourself rather than trusting a helper's ordering.

## 6. What this means for blue-eyed

Reading this as design input rather than a survey, here is what I take from it.

**The mechanism is settled prior art.** Pomerium's chained callback is the only shipping implementation of cross-apex forward-auth SSO, and the shape is: reserved path on each protected domain, signed and encrypted short-lived artifact in the query string, per-hop cookie mint, chain until done. authentik proves the callback leg works inside a Traefik ForwardAuth subrequest without any special proxy config, because Traefik copies headers verbatim on non-2xx. Those two facts together mean we can build this against a stock Traefik middleware. That is the answer to the ticket.

**The reserved path is unavoidable.** Every project that does anything cross-domain has one: `/.pomerium/callback/`, `/outpost.goauthentik.io/`, `/oauth/callback`, `/oauth2/callback`. Ours needs a name that will not collide, and it needs to be a pre-auth attack surface we treat as such. Pomerium CVE-2026-50285 is a decompression bomb on exactly that endpoint. Bound every input.

**Passkeys pin the login ceremony to one hostname.** WebAuthn RP IDs cannot span apexes. Pocket ID and Authelia both hit this. So blue-eyed has one canonical auth hostname where credentials are presented, and every protected domain reaches it by redirect. That is not a constraint to work around, it is the architecture.

**Server-side sessions, keyed so we can delete by user.** This is the answer to both logout and revocation. We cannot clear a cookie on a domain we are not currently responding from, but we can kill the record it points at, which is what authentik's `Logout(sub match)` does. Every project with stateless cookies pays for it: oauth2-proxy's seven-day revocation window, Pocket ID's total absence of revocation. Forward auth hits the store on every request anyway. SQLite is already a premise.

**Copy specific things.** The `state`-bound-to-session-ID check from authentik, with an expiry added. The return-target-in-a-first-party-cookie trick from gogatekeeper, so the return URL is never attacker-supplied. Domain-suffixed cookie names from tinyauth. The public-suffix check before setting any cookie `Domain`. Sliding expiry with a separate hard max lifetime. Answering XHR with 401 and browsers with 302, keyed on `Accept` rather than User-Agent.

**Decide `X-Forwarded-*` trust explicitly and loudly.** Authelia has no trusted-proxy option and puts it in the docs. oauth2-proxy added `--trusted-proxy-ip` for CVE-2026-40575 and then **defaulted it to `0.0.0.0/0` for backwards compatibility**, so upgrading does not fix anything. tinyauth reads the headers with no verification at all. This is the single most common misconfiguration in the whole category, and our audience is the least equipped to get it right. Whatever we choose, it should be a first-class, validated config field with a safe default and a startup refusal rather than a warning.

**Two open questions this raises for the protocol design ticket ([#45](https://github.com/Eloquentia-Studios/blue-eyed/issues/45)).** First, whether the chain is eager (mint cookies on every registered domain at login, Pomerium-style) or lazy (mint on first visit to each domain). Eager costs N redirects at login and needs a domain list; lazy costs one extra round trip per domain but degrades gracefully and needs no list. Second, whether the minted artifact is a signed JWT or an opaque one-time handle looked up in SQLite. Given we have the database and given the replay findings above, the handle is the safer default and it makes single-use trivial.
