# Passkeys in a multi-domain auth server

Research for [#41](https://github.com/Eloquentia-Studios/blue-eyed/issues/41), under map [#37](https://github.com/Eloquentia-Studios/blue-eyed/issues/37).
Verified 2026-08-20 against the WebAuthn spec, FIDO Alliance material, browser vendor docs, the Public Suffix List, and the `go-webauthn/webauthn` source at commit `2190797`.

## The short version

The working assumption in the ticket is half right, and the half that is wrong is the half that will bite a homelab.

**Confirmed.** Protected services living on unrelated apex domains cost blue-eyed nothing in WebAuthn terms. The ceremony runs at blue-eyed's own origin, the credential is scoped to blue-eyed's RP ID, and what crosses the redirect afterwards is a session cookie or an OIDC code, not an assertion. Sonarr on `media.example.net` and Gitea on `git.other-apex.io` never appear anywhere in the WebAuthn data model. "Multi-domain from day one" and "passkeys primary" do not fight each other.

**Destroyed.** The RP ID is frozen into every credential at registration. If blue-eyed is reachable at more than one hostname, and those hostnames do not share a registrable domain, the passkeys enrolled at one hostname are unusable at the other. Not degraded. Unusable. `auth.example.com` on the LAN plus `a7f3c2.trycloudflare.com` through a tunnel is exactly the case that breaks, and it is a normal thing for a homelab to do. This is a real constraint, it has no clean fix, and blue-eyed has to take a position on it before anyone enrolls a credential.

Everything else in the ticket resolves cleanly. Discoverable credentials are required and the compatibility cost is now small. Conditional UI is fine but has one specific fight with a CSR SPA in the redirect path. Attestation should be `none`. Password fallback has real standards vocabulary behind it. `go-webauthn/webauthn` is healthy, actively developed, and its API fits.

## 1. RP ID and the multi-hostname problem

### How the binding works

The RP ID is a domain string. When `PublicKeyCredentialCreationOptions.rp.id` is omitted the client uses the effective domain of the caller's origin. When it is supplied, the client accepts it only if it is a registrable domain suffix of, or equal to, the caller's effective domain (WebAuthn §5.1.3 for create, §5.1.4 for get). So `https://auth.example.com` may claim `auth.example.com` or `example.com`, and nothing else.

At registration the authenticator stores the SHA-256 of the RP ID and returns it as `rpIdHash` in the authenticator data of every subsequent assertion. The RP verifies that hash against its own RP ID (§7.2). There is no field to change it and no ceremony that rewrites it. A credential's RP ID is as permanent as its key pair.

The origin is verified separately, against the RP's own list of acceptable origins. RP ID and origin are two different checks, which is why one RP ID can serve several hostnames as long as they all sit under it.

### Case A: sibling hostnames, same apex

`auth.example.com` and `auth2.example.com` with RP ID `example.com`. Works. Both origins are under the RP ID, credentials are shared, nothing special is needed beyond listing both origins server-side. The cost is that the RP ID is now the apex, so any subdomain of `example.com` that an attacker controls can run ceremonies against those credentials. For a household that owns the domain outright this is acceptable. Pinning the RP ID to the apex when you only need one host is still worth avoiding where you can.

### Case B: unrelated apexes

`auth.example.com` and `a7f3c2.trycloudflare.com`. No RP ID is a registrable domain suffix of both, so no single value covers them. Credentials enrolled at one hostname produce an `rpIdHash` the other hostname's ceremony rejects. The user sees "no passkeys available" or a failed assertion, depending on the client.

I checked the Public Suffix List directly rather than guessing at it, because the homelab tunnel providers are all on it:

| Entry | PSL line | Consequence |
|---|---|---|
| `trycloudflare.com` | 12729 | `<random>.trycloudflare.com` is the registrable domain. Quick tunnels get a fresh random label on every restart, so an RP ID pinned to one dies with the tunnel. |
| `ts.net`, `*.c.ts.net` | 15979-15980 | `<tailnet>.ts.net` is registrable, so RP ID `<tailnet>.ts.net` is legal and stable. A tailnet-only deployment is actually fine. |
| `duckdns.org` | 13039 | `<name>.duckdns.org` is registrable and stable. Also fine. |
| `ngrok.io`, `ngrok.app`, and eight siblings | 14840-14853 | Public suffixes, same story as Cloudflare quick tunnels. |

So the tunnels split into two groups. Stable-name providers (Tailscale, DuckDNS, a paid ngrok reserved domain) can carry an RP ID. Ephemeral-name providers cannot, and a credential enrolled through a Cloudflare quick tunnel is garbage the moment the tunnel restarts.

Also worth stating plainly: an RP ID that is itself a public suffix is rejected. Nobody gets `ts.net` or `co.uk`.

### localhost

`http://localhost` is a potentially trustworthy origin by the secure-context rules, so WebAuthn works there over plain HTTP with RP ID `localhost`. Every other hostname needs HTTPS. Credentials enrolled against `localhost` are scoped to `localhost` and are worthless in production, which is fine for development but means a developer cannot carry their dev passkey to a real instance.

### Related Origin Requests, and why it does not rescue us

WebAuthn Level 3 §5.11 adds Related Origin Requests. When a ceremony's origin does not sit under the claimed RP ID, the client fetches `https://<rpid>/.well-known/webauthn` and accepts the ceremony if the origin appears in the returned `{"origins": [...]}` array. Chrome shipped it in the 128/129 window. `go-webauthn` implements both the document and the label accounting.

The limit that matters is not the label budget, though that budget is real: clients process at most 5 distinct registrable domain labels and silently ignore origins beyond it, so `MaximumRelatedOriginLabels = 5` is a hard ceiling in practice. Origins sharing a label cost one between them, which is why the feature is pitched at `example.com` / `example.co.uk` / `example.de` brand families.

The limit that kills it for blue-eyed is the fetch. The client fetches the well-known document **from the RP ID host**. In the split-horizon homelab case the RP ID host is precisely the host that is not reachable from where the user is standing. You are on your phone on cellular, hitting the Cloudflare tunnel, and the browser wants to fetch `https://auth.example.com/.well-known/webauthn`, which resolves to a LAN address or does not resolve at all. Related Origin Requests solves the problem of one RP whose users arrive from several public sibling domains. It does not solve the problem of one RP that is reachable at different names depending on which network you are on.

### Migration path

There isn't one. I looked for a signal API, an RP ID rotation ceremony, anything in Level 3 or in FIDO's credential exchange work that would let an RP move credentials from one RP ID to another. Credential Exchange (CXP/CXF) moves credentials between *providers*, not between RP IDs. Changing blue-eyed's RP ID means every user re-enrolls every passkey, mediated by whatever recovery path exists. Given that blue-eyed's recovery is admin-mediated plus CLI break-glass, an RP ID change on a single-admin instance where the admin's own passkey is the one that broke is a genuine lockout.

### What this forces blue-eyed to decide

The RP ID is a hard-to-reverse decision made at first run, before the first credential exists, by an operator who probably has not thought about it. That is ADR territory, and the ADR should say what the operator is being asked for and what happens if they get it wrong.

Concretely, the options I can see:

1. **One RP ID, configured at first run, immutable afterwards.** Honest and simple. The operator picks the hostname their users will always use. Everything else is denied WebAuthn. Passkey enrollment through a second hostname just does not work, and blue-eyed should say so out loud in the UI rather than failing with a browser error.
2. **One RP ID plus a related-origins document**, for the case where the RP ID host genuinely is publicly reachable. Buys sibling public domains, buys nothing for split-horizon.
3. **RP ID per hostname**, treating credentials as scoped to an access path. Users enroll once per hostname they use. This is not a standard shape and it makes the credential list confusing, but it is the only thing that actually works for LAN plus tunnel. Worth grilling rather than dismissing.
4. **Refuse the problem.** Declare that blue-eyed must be reached at exactly one hostname and that operators wanting remote access put the tunnel behind that same name. This is the cheapest to build and the most likely to be ignored by users.

My instinct is 1 with a very loud first-run warning, and password fallback as the deliberate escape hatch for the second hostname, since a password is not RP-ID-bound. That makes the multi-hostname case a downgrade rather than a lockout, which ties directly into the fallback design in section 6.

## 2. Discoverable credentials

Discoverable credentials (the spec's term; `rk` in CTAP, "resident keys" in older material) are required for any login that starts with an empty `allowCredentials`. The mechanism is simple: with no credential IDs to offer, the client has to ask authenticators what they hold for this RP ID, and only a discoverable credential answers that question. Usernameless login and conditional UI both depend on it. There is no way around this.

Request it with `authenticatorSelection.residentKey: "required"`. Confirm you got it with the `credProps` extension, whose `rk` output tells you whether the credential is actually discoverable. `go-webauthn` exposes both (`WithResidentKeyRequirement`, `WithExtensionCredProps`).

Storage limits are the compatibility cost, and they land almost entirely on hardware keys. Yubico's own numbers: YubiKey 5 firmware 5.0 through 5.6.x hold 25 discoverable credentials; firmware 5.7 and later hold 100, alongside 24 PIV certificates, 64 OATH seeds and 2 OTP seeds. When the slots are full, registration fails and the user has to delete something. Synced providers (iCloud Keychain, Google Password Manager, 1Password, Bitwarden) do not have a limit any user will hit.

For blue-eyed's audience this is a non-issue. A household member registering one passkey per authenticator against one auth server is not going to exhaust 25 slots, let alone 100. Requiring discoverable credentials in 2026 costs essentially nothing and buys usernameless login, which for a login page that appears in the middle of a redirect bounce is worth a lot.

## 3. Conditional UI

The shape is fixed by the spec and MDN documents it directly:

- Put `autocomplete="username webauthn"` on the username input.
- Gate on `await PublicKeyCredential.isConditionalMediationAvailable()`.
- Call `navigator.credentials.get({publicKey: options, mediation: "conditional"})` with `allowCredentials` omitted.
- The browser only surfaces discoverable credentials, and it waits for the user to interact with the field before querying authenticators.

The call is long-lived. It sits pending while the user looks at the page and resolves if they pick a passkey from the autofill dropdown. That is what makes it awkward in a CSR SPA, and blue-eyed has two specific fights:

**The challenge must exist before the field is useful.** The conditional `get()` needs a server-issued challenge, so the sequence on a cold login is: redirect lands, HTML shell downloads, JS bundle downloads, React mounts, fetch the challenge, then start the conditional call. Only then does the autofill dropdown offer a passkey. On the map's known tension (every forward-auth miss on a foreign domain is a bounce through the SPA shell), this stacks another round trip on top of an already slow path. The mitigation is to make the challenge endpoint the first thing the app touches and to preload it rather than waiting for the login route to mount, but it does not disappear.

**One outstanding conditional request, and the SPA router will violate it.** A conditional `get()` must be aborted with an `AbortController` before starting a modal `get()` for the "use a passkey" button, and before navigating away. TanStack Router route changes do not unmount-and-abort for you unless you wire it. An orphaned conditional request is a real bug class here, not a theoretical one.

I could not verify from a primary source, within this session, the exact current support matrix for conditional mediation across Chrome, Safari, Firefox and Edge on desktop and mobile, nor the shipping status of conditional `create()` (passkey upgrades) and `PublicKeyCredential.getClientCapabilities()`. `isConditionalMediationAvailable()` is the right runtime gate regardless, and `getClientCapabilities()` is worth re-checking before the frontend ADR is written. Treat those three as open.

## 4. Cross-device authentication

The hybrid transport, formerly caBLE, is how a passkey on a phone signs a user in on a desktop. The desktop shows a QR code, the phone scans it, the two do a key agreement, and then they talk over a channel while BLE proximity advertisement proves the phone is physically near the desktop. The proximity check is the anti-phishing property. It is why hybrid cannot be relayed by an attacker who has merely tricked the user into scanning a code on a remote screen.

The transport channel changed recently and it matters for this audience. CTAP 2.2 (published 2025-07-14) specified WebSocket tunnels to a relay server. CTAP 2.3 (published 2026-02-26) is a backwards-compatible update whose headline change is that QR-initiated hybrid transactions can negotiate Bluetooth Low Energy as the data channel instead of the WebSocket. Yubico's framing is that this matters where egress filtering blocks connections to FIDO relay servers. That is an enterprise framing, but it applies equally to a locked-down home network or an offline lab.

For blue-eyed the practical points:

- The phone is always required. Hybrid does not copy a credential to the desktop and does not leave anything behind. Every login through hybrid is another QR scan unless the platform's "link this device" state-assisted flow kicks in, which is a platform decision blue-eyed does not control.
- BLE has to work. No Bluetooth on the desktop, or Bluetooth off, and the flow fails. Some Linux desktop setups in exactly this audience will not have it working.
- The RP does nothing to enable it. Hybrid is client-mediated. blue-eyed's only lever is `hints` and the credential's stored `transports`.
- `PublicKeyCredentialHints` (`security-key`, `client-device`, `hybrid`) is supported by `go-webauthn` on both ceremonies (`WithPublicKeyCredentialHints`, `WithAssertionPublicKeyCredentialHints`). It is a hint to the client's UI about which flow to lead with, not a restriction.

I did not verify the current per-platform hybrid support matrix from vendor docs. Treat it as open, though the flow is universal enough by 2026 that I doubt it produces a surprise.

## 5. Attestation

Use `none`. This is not a close call.

The conveyance values are `none`, `indirect`, `direct` and `enterprise` (WebAuthn §5.4.7). passkeys.dev, which the FIDO Alliance and the W3C WebAuthn community group maintain, says most relying parties should not specify `attestation` at all, defaulting to `none`, or should use `indirect`, and gives avoiding extra consent prompts and the abandonment they cause as the reason.

Yubico, who sell the hardware that attestation is supposed to prove things about, are just as blunt: "we recommend that you do not require a trusted attestation unless you have specific reason to do so", "requiring attestation is an invasive policy, especially when used to restrict users' choice of authenticator. For some applications this is necessary; for most it is not", and "when in doubt, err towards being more permissive, because using a passkey is more secure than not using a passkey."

Verifying attestation also means running the FIDO Metadata Service: fetching the MDS blob, refreshing it, and handling blob expiry. That is a network dependency with a scheduled failure mode, in a project whose deployment premise is a single container with zero external dependencies. Attestation verification is directly incompatible with that premise.

And it would buy nothing anyway. Google's own web.dev documentation notes that passkeys on Android and Apple platforms do not support attestation, so the two providers most of blue-eyed's users will actually use return nothing to verify.

The one thing worth keeping is the AAGUID, which arrives in the authenticator data regardless. Feed it through the community list at `passkeydeveloper/passkey-authenticator-aaguids` and the credential list can say "1Password" or "iCloud Keychain" with an icon instead of a hex string. That is a UI nicety, not a security control, and blue-eyed should be honest with itself that an unattested AAGUID is self-reported and trivially spoofed. Shipping the list means bundling a JSON file that goes stale, which for a zero-dependency container is a tradeoff worth making deliberately.

Narrow reason to want `direct`: none that applies here. `enterprise` attestation is for organizations issuing managed authenticators, which is explicitly out of scope.

## 6. Password fallback

There is more standards vocabulary here than I expected, and it is usable.

### FIDO's staged model

FIDO Alliance's Passkey Central lays out four stages. Legacy (phishable only). Optional Adoption, where passkeys exist alongside phishable methods with no enforcement, and which the guidance dismisses: these services "consistently allow fallback to phishable authentication methods, leaving accounts vulnerable to compromise through phishing." Partial Prevention, supporting both while "enforcing the use of phishing-resistant methods under specific conditions". Full Prevention, where "RPs must not rely on phishable methods for login or account recovery under any conditions".

FIDO's own note is that few organizations reach Full Prevention. Their UX guidelines add that if you offer a "try another way" option it should not route to a phishable method.

The map has already settled that blue-eyed has password fallback, so Full Prevention is off the table by premise. That puts blue-eyed at Partial Prevention, and Partial Prevention is defined by the conditions under which phishing resistance is enforced. Those conditions are the actual design question, and nobody has specified them yet.

### The vocabulary for a downgraded session

This is the useful find. OpenID Connect EAP ACR Values 1.0 (Final, 2025-06-15) registers two ACR values:

- `phr`, phishing-resistant: "An authentication mechanism where a party potentially under the control of the Relying Party cannot gain sufficient information to be able to successfully authenticate to the End User's OpenID Provider as if that party were the End User."
- `phrh`, phishing-resistant hardware-protected: the same, plus the key material being held in hardware.

A passkey login satisfies `phr`. A device-bound passkey satisfies `phrh`. A password login satisfies neither. So blue-eyed can express "this session was established with a password" in a standard way, in the `acr` claim, and a relying application can demand better via `acr_values`. RFC 9470 (OAuth 2.0 Step Up Authentication Challenge Protocol) gives the runtime shape: a resource returns `insufficient_user_authentication` with the `acr_values` it needs, and the client re-authorizes.

On the `amr` side there is less to work with. The IANA registry (RFC 8176, last updated 2024-10-04) has `pwd`, `hwk`, `swk`, `pop`, `mfa`, `user`, `pin` and the biometrics, and nothing that means "passkey" or "phishing-resistant". `swk` for a synced passkey and `hwk` for a device-bound one is the closest honest mapping, and it is a mapping blue-eyed would be inventing. The phishing-resistance signal belongs in `acr`, not `amr`.

Worth being clear that this vocabulary only pays off for OIDC clients that actually read `acr`. For the Traefik forward-auth plane there is no such channel, so if blue-eyed wants "password sessions cannot reach the admin UI" it has to enforce that itself in its own authorization decision. That is a seam between the two planes that the access-control ticket will need to know about.

### NIST

NIST SP 800-63B defines phishing resistance in §3.2.5 as "the ability of the authentication protocol to prevent the disclosure of authentication secrets and valid authenticator outputs to an impostor verifier", and classifies passwords, look-up secrets and OTPs as lacking it. Syncable authenticators "SHALL NOT be used at AAL3" (§2.3.2), so synced passkeys top out at AAL2 and device-bound passkeys can reach AAL3.

I looked for NIST text requiring that a fallback authenticator not be weaker than the primary, and for text requiring that recovery be no weaker than the credential it restores. I did not find either. If someone wants to argue "recovery is the real weak link" in an ADR, that argument stands on its own logic, not on a NIST citation. It is still true: blue-eyed's admin-mediated recovery means the account's real strength is the strength of the admin's judgement, and the CLI break-glass means it is also the strength of shell access to the container.

### Patterns worth grilling

Identifier-first with passkey by default and password behind "other ways to sign in" is what passkeys.dev's bootstrapping guidance describes: collect the username, run conditional UI, and if that does not resolve, "perform a 'legacy' user authentication". That is endorsed.

Deleting the password once a passkey is enrolled is FIDO's Full Prevention and is ruled out by the map's premise. Making the password insufficient on its own, or making a password session a lower-privilege session that must step up to a passkey for anything that matters, is Partial Prevention with a specific condition, and `phr` plus RFC 9470 is exactly the machinery for it. I did not find a primary source prescribing that particular shape, so it is a design proposal, not a cited recommendation.

There is a neat interaction with section 1 here. If the password fallback exists mainly so that a user hitting blue-eyed at its second hostname is not locked out, then the password is the deliberate answer to the RP ID problem, and the correct privilege level for a password session is "enough to use your services, not enough to administer blue-eyed". That is a coherent story rather than two unrelated compromises.

## 7. go-webauthn/webauthn

### Health

Healthy, and more active than I expected. BSD-3-Clause. Pure Go, no cgo. Primary maintainer James Elliott, who also maintains Authelia, which is the closest thing blue-eyed has to a sibling project and is presumably where the requirements pressure comes from.

Latest tagged release is v0.17.4 (2026-05-22). But master has 75 commits since that tag, several of them landing in the week of 2026-08-15, and they include the features most relevant to this ticket. Dependencies are modest: CBOR, mapstructure, jwt, go-tpm, uuid, msgp, plus the project's own `go-webauthn/x`. `go.mod` declares `go 1.25.0` with a `go1.27.0` toolchain directive, which is aggressive and worth knowing about if blue-eyed wants to pin an older Go.

The lineage is the maintained fork of `duo-labs/webauthn`, and it is the consensus Go choice. I did not survey alternatives thoroughly enough to claim there is nothing better.

### Released versus unreleased

This gap is worth planning around. Present on master, absent from v0.17.4:

| Feature | Source file | In v0.17.4 |
|---|---|---|
| Related Origin Requests document and handler | `protocol/related_origins.go`, `webauthn/related_origins.go` | no |
| Client capability enumeration | `protocol/client_capabilities.go` | no |
| Opaque origin configuration (`RPOpaqueOrigins`) | `webauthn/types.go` | no |
| Per-ceremony origin binding (`WithLoginOrigin`, `WithRegistrationOrigin`) | `webauthn/login_opt.go`, `webauthn/registration_opt.go` | no |
| `SessionData.Origin` field | `webauthn/types_session.go` | no |

If blue-eyed wants related origins or per-ceremony origin binding it either waits for v0.18 or pins a commit. Given that section 1 concludes related origins does not rescue the split-horizon case anyway, waiting is fine.

### Configuration, and what it does not check

```go
type Config struct {
	RPID                        string
	RPDisplayName               string
	RPOrigins                   []string
	RPOpaqueOrigins             []string   // master only
	RPTopOrigins                []string
	RPTopOriginVerificationMode protocol.TopOriginVerificationMode
	RPAllowCrossOrigin          bool
	AttestationPreference       protocol.ConveyancePreference
	AuthenticatorSelection      protocol.AuthenticatorSelection
	Timeouts                    TimeoutsConfig
	MDS                         metadata.Provider
	Attestation                 protocol.AttestationPolicy
	Signature                   protocol.SignaturePolicy
	Filtering                   *FilteringConfig
	// ...
}
```

`RPOrigins` is a list, and that is the mechanism for one RP ID serving several hostnames. Origins beginning `http://` or `https://` are matched on scheme and host case-insensitively; anything else falls back to plain string comparison.

Here is the sharp edge. `Config.validate()` requires `RPID` to be a valid domain string (`protocol.ValidateRPID`, which rejects IP addresses, ports, paths, queries and fragments) and requires at least one entry in `RPOrigins`. **It does not check that `RPID` is a registrable domain suffix of the origins in `RPOrigins`.** A misconfiguration where they do not line up starts up cleanly and fails at ceremony time in the browser, which is the worst place to discover it. blue-eyed should do that check itself at config load and refuse to start.

Two more defaults worth knowing. `RPAllowCrossOrigin` is false, so cross-origin ceremonies are refused unless enabled. `RPTopOriginVerificationMode` coerces its zero value to explicit verification, and as of v0.17.0 there is no mode that disables top-origin verification entirely. Both are correct for blue-eyed and neither should be touched.

### Ceremony API

The `User` interface an app implements is four methods: `WebAuthnID() []byte`, `WebAuthnName() string`, `WebAuthnDisplayName() string`, `WebAuthnCredentials() []Credential`. The docs are emphatic that `WebAuthnID` is an opaque handle of up to 64 bytes, that it should be fully random, and that authorization decisions must be made on it rather than on the name.

Registration is `BeginRegistration(user, opts...) (*protocol.CredentialCreation, *SessionData, error)` and `FinishRegistration(user, session, *http.Request) (*Credential, error)`, with `CreateCredential` as the pre-parsed variant. `BeginMediatedRegistration` adds a mediation requirement. Options include `WithAuthenticatorSelection`, `WithResidentKeyRequirement`, `WithConveyancePreference`, `WithExclusions`, `WithPublicKeyCredentialHints`, `WithExtensionCredProps`.

Login splits four ways along two axes, known user versus discoverable, and default versus explicit mediation:

```go
BeginLogin(user, opts...)
BeginMediatedLogin(user, mediation, opts...)
BeginDiscoverableLogin(opts...)
BeginDiscoverableMediatedLogin(mediation, opts...)
```

`BeginMediatedLogin` returns `ErrBadRequest` with "Found no credentials for user" when the user has none, which is a user-enumeration hazard if blue-eyed surfaces it. The discoverable variants call through with a nil user ID and nil allow-list.

The discoverable finish takes a lookup callback:

```go
type DiscoverableUserHandler func(rawID, userHandle []byte) (user User, err error)

FinishDiscoverableLogin(handler, session, *http.Request) (*Credential, error)
FinishPasskeyLogin(handler, session, *http.Request) (User, *Credential, error)
```

`FinishPasskeyLogin` returning the resolved user as well as the credential is the one blue-eyed wants for usernameless login, since the whole point is that the server did not know who was logging in.

Errors are `*protocol.Error` with `Type`, `Details`, `DevInfo` and a wrapped `Err`, so they work with `errors.Is`/`errors.As`. The named values are things like `ErrBadRequest`, `ErrVerification`, `ErrChallengeMismatch`, `ErrAttestation`. A user cancelling in the browser never reaches the server at all, so distinguishing cancel from failure is the frontend's job, not the library's.

### Ceremony state, which is what the ticket asked about

```go
type SessionData struct {
	Challenge            string
	RelyingPartyID       string
	Origin               string   // master only
	UserID               []byte
	AllowedCredentialIDs [][]byte
	Expires              time.Time

	UserVerification protocol.UserVerificationRequirement
	Extensions       protocol.SessionExtensions
	CredParams       []protocol.CredentialParameter
	Mediation        protocol.CredentialMediationRequirement
}
```

The library's guidance is specific and blue-eyed should follow it literally. Store it server-side or in a signed opaque cookie. Treat it as atomic: "Every field returned by the Begin* functions must be delivered to the matching Finish*/Validate* call with the same values; if anything is dropped or reshaped in transit, verification will fail." Do not reconstruct it by hand, because a hand-built `SessionData` loses the record of which extensions were requested and legitimate extension outputs get rejected under the default `UnsolicitedOutputPolicyReject`. Decode into a fresh value, since `Extensions` is not cleared when the encoded payload omits it. Discard after the ceremony.

Two warnings from the source that would be easy to miss:

The bytes handed back to the decoder MUST be bytes the library serialized and which the RP kept integrity-protected. This is sharpest for MessagePack: the generated `UnmarshalMsg`/`DecodeMsg` size their allocations from length prefixes on the wire before reading the payload, so a few malformed bytes can make the process allocate gigabytes and get OOM-killed. In a single container that fronts every other service, that is the whole gateway going down. Use JSON, or use msgp only behind an authenticated envelope.

The serialized shape of `SessionData.Extensions` changes across releases in both encodings. In-flight sessions must be drained or invalidated as part of a deployment, not carried across it. For a single-container upgrade story this means an upgrade can break a ceremony a user is halfway through, which is survivable but should be a known behaviour rather than a bug report.

On timeouts, `TimeoutsConfig` carries separate login and registration settings, each with `Enforce`, `Timeout`, and `TimeoutUVD` for the user-verification-discouraged case. `Enforce` defaults to false, meaning only the browser enforces the timeout. blue-eyed should set `Enforce: true` and have the server check `SessionData.Expires`, which `ValidatePasskeyLogin` already does when the value is non-zero.

For discoverable login, `SessionData.UserID` is empty by construction, and `ValidatePasskeyLogin` rejects a session that has one with "Session was not initiated as a client-side discoverable login". It also rejects an assertion with a blank user handle. So the flow is genuinely stateless with respect to identity: the challenge is issued to nobody in particular, and identity arrives with the assertion. That is the right shape for a login page rendered on a cold redirect bounce, because the challenge can be fetched before the user has typed anything.

### Credential record

```go
type Credential struct {
	ID                []byte
	PublicKey         []byte
	AttestationType   string   // "basic_full", "basic_surrogate", "attca", "anonca", "none"
	AttestationFormat string   // "packed", "tpm", "apple", "none", ...
	Transport         []protocol.AuthenticatorTransport
	Flags             CredentialFlags
	Authenticator     Authenticator   // AAGUID, SignCount, CloneWarning, Attachment
	Attestation       CredentialAttestation
}
```

`CredentialFlags` carries `UserPresent`, `UserVerified`, `BackupEligible` (BE) and `BackupState` (BS). The source is worth quoting on two of these. `UserVerified` on a stored record is the spec's latched `uvInitialized`: once an assertion has verified the user it stays true, so to know whether *this* ceremony verified the user you read the ceremony's own authenticator data, not the stored record. BE "should NEVER change". BS can change and the library recommends tracking it.

BE and BS are how blue-eyed can tell a synced passkey from a device-bound one without attestation, which is the input the `phr` versus `phrh` distinction in section 6 needs, and also the input for a UI that wants to warn "this passkey exists only on one device".

`Authenticator.UpdateCounter` implements the §7.2 step 17 clone check, and the guard is `if authDataCount <= a.SignCount && (authDataCount != 0 || a.SignCount != 0)`. The second clause is what stops synced passkeys, which report a constant zero counter, from tripping a clone warning on every login. So the counter is genuinely useless for synced credentials and meaningful only for hardware ones. `CloneWarning` is set, never acted on. What blue-eyed does with it is a policy decision, and for this audience logging it is probably the right answer rather than failing the login.

The library recommends persisting credentials as explicit typed columns rather than an opaque blob, so the database can index and constrain them. With embedded SQLite that advice holds.

## Open questions

Things I could not verify from a primary source in this session, listed so nobody mistakes them for settled:

- Current conditional-mediation support matrix across Chrome, Safari, Firefox and Edge, desktop and mobile.
- Whether conditional `create()` (passkey upgrades) and `PublicKeyCredential.getClientCapabilities()` have shipped and where.
- Current per-platform hybrid/cross-device support matrix.
- Whether Safari and Firefox have shipped Related Origin Requests. Only Chrome's 128/129 window is confirmed here. This does not change the conclusion in section 1, since the fetch-reachability problem is not a browser-support problem.
- Practical discoverable-credential limits for password-manager passkey providers. No vendor publishes one, and I found no evidence any user hits one.

## Feeds into

- An ADR on the RP ID: what is configured, when, and what happens when blue-eyed is reached at a second hostname. This is the hard-to-reverse one.
- The credential model ticket: discoverable required, `none` attestation, what a credential record stores (BE/BS, AAGUID, transports, counter).
- The access-control ticket: whether a password session is a lower-privilege session, and how that is enforced on the forward-auth plane where there is no `acr` claim to carry it.
- The frontend ticket: conditional UI in a CSR SPA, challenge preloading, `AbortController` discipline across TanStack Router navigations.
- First-run/bootstrap, which is where the RP ID gets chosen by someone who does not yet know what it is.

## Sources

WebAuthn and FIDO

- W3C Web Authentication Level 3, [§5.11 Related Origin Requests](https://www.w3.org/TR/webauthn-3/#sctn-related-origins), §5.1.3, §5.1.4, §5.4.7, §7.2
- [passkeys.dev, Related Origin Requests](https://passkeys.dev/docs/advanced/related-origins/)
- [passkeys.dev, Bootstrapping](https://passkeys.dev/docs/use-cases/bootstrapping/)
- [FIDO Alliance Passkey Central, Passkeys: The Journey to Prevent Phishing Attacks](https://www.passkeycentral.org/passkey-roll-out-guides/prevent-phishing/)
- [FIDO Alliance UX Guidelines for Passkey Creation and Sign-ins](https://fidoalliance.org/wp-content/uploads/2023/05/FIDO-Alliance-UX-Guidelines-for-Passkey-Creation-and-Sign-ins.pdf)
- [FIDO CTAP 2.2, Proposed Standard 2025-07-14](https://fidoalliance.org/specs/fido-v2.2-ps-20250714/fido-client-to-authenticator-protocol-v2.2-ps-20250714.html)
- [Yubico, CTAP 2.3](https://developers.yubico.com/CTAP/CTAP2.3.html)
- [Yubico, Passkey relying party implementation guidance: Attestation](https://developers.yubico.com/Passkeys/Passkey_relying_party_implementation_guidance/Attestation/)
- [Yubico, YubiKey 5.7 firmware specifics](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-firmware-5.7.html)

Browser vendors

- [Chrome for Developers, Introducing hints, Related Origin Requests and JSON serialization for WebAuthn in Chrome](https://developer.chrome.com/blog/passkeys-updates-chrome-129)
- [Chrome Platform Status, WebAuthn related origins](https://chromestatus.com/feature/4635336177352704)
- [web.dev, Determine the passkey provider with AAGUID](https://web.dev/articles/webauthn-aaguid)
- [MDN, Web Authentication API (Autofill UI)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [MDN, CredentialsContainer.get()](https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/get)
- [passkeydeveloper/passkey-authenticator-aaguids](https://github.com/passkeydeveloper/passkey-authenticator-aaguids)

Identity standards

- [OpenID Connect Extended Authentication Profile (EAP) ACR Values 1.0, Final, 2025-06-15](https://openid.net/specs/openid-connect-eap-acr-values-1_0.html)
- [RFC 8176, Authentication Method Reference Values](https://www.rfc-editor.org/rfc/rfc8176.html)
- [IANA Authentication Method Reference Values registry](https://www.iana.org/assignments/authentication-method-reference-values/authentication-method-reference-values.xhtml)
- [RFC 9470, OAuth 2.0 Step Up Authentication Challenge Protocol](https://www.rfc-editor.org/rfc/rfc9470.html)
- [NIST SP 800-63B, Digital Identity Guidelines: Authentication](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat), fetched 2026-08-20

Library

- [go-webauthn/webauthn](https://github.com/go-webauthn/webauthn), master at `2190797` and tag `v0.17.4`
- [go-webauthn/webauthn releases](https://github.com/go-webauthn/webauthn/releases)
- [pkg.go.dev: webauthn](https://pkg.go.dev/github.com/go-webauthn/webauthn/webauthn), [protocol](https://pkg.go.dev/github.com/go-webauthn/webauthn/protocol)

---

# Appendix: late findings (discoverable credentials, conditional UI, hybrid)

Added after this document was first written. A parallel worker on discoverable credentials, conditional mediation, and hybrid transport reported after the ticket closed. The conclusions above are unchanged; the material below sharpens sections 2, 3 and 4 and adds constraints that land on the Go backend and the React login page.

## Discoverable credentials

- **Omitting `residentKey` means `discouraged`, not `preferred`** (WebAuthn L3 §5.4.4). Silence gets server-side credentials, which can never appear in usernameless login.
- CTAP 2.2 §6.1.3 tightened this: with `rk` false the authenticator **MUST** create a non-discoverable credential. On CTAP 2.0 keys it was optional, so behaviour differs by authenticator age.
- **Discoverable credentials are mechanically required for usernameless login.** A non-discoverable credential's private key is wrapped inside the credential ID, so it can only be used when the server hands that ID back in `allowCredentials`. Conditional mediation sets `allowCredentials` to empty (§5.1.4.1), which excludes them by construction.
- **Slot exhaustion is a roaming-security-key problem only.** YubiKey 5.0–5.6.x hold 25 discoverable credentials, 5.7+ hold 100. A full key returns `CTAP2_ERR_KEY_STORE_FULL`, surfaced to the user only *after* they have touched it. Sync-fabric providers (iCloud Keychain, Google Password Manager) document no limit.
- Consequence: `residentKey: "required"` on the primary platform path, but a separate "add a security key" path at `"preferred"` so a full key degrades instead of hard-failing. This is Yubico's own published guidance to service providers.
- Request the **`credProps`** extension and persist `credProps.rk` per credential as a tri-state (true / false / unknown). It is the only way to know whether a given credential can serve usernameless login.

## Conditional UI: constraints on a CSR React login page

This is where the map's recorded CSR tension becomes concrete. All of the following is normative, not stylistic.

- **A conditional `get()` may never settle.** Its lifetime timer is set to infinity, tied to the Document. If the user clicks outside the autofill dropdown the promise neither resolves nor rejects. No UI state may depend on it settling.
- **Only one outstanding credential request per type is allowed.** Credential Management L1 rejects a second `navigator.credentials.get({publicKey})` with `NotAllowedError` while one is active. Since the conditional request may never settle on its own, a "Sign in with a passkey" button will fail unless the conditional request is explicitly aborted first. The same guard applies to `create()`.
- **A client-side route change does not tear it down.** The lifetime is tied to the Document, and SPA navigation does not create a new one, so a request armed on `/login` stays armed on `/signup` and keeps blocking modal calls. Abort on route change and re-arm on route enter. In React StrictMode the double-invoked effect trips the same guard in development.
- Hold the `AbortController` at **module scope**, not component state, and abort in effect cleanup.
- The `autocomplete` token must be **last**: `username webauthn`, not `webauthn username`.
- **The `get()` must be in flight before the input is focused.** Re-arming later does not populate an already-open dropdown.
- **Redirect-bounce latency.** The serial chain is redirect → HTML → bundle → mount → fetch challenge → `get()`, easily 500ms–1.5s on a cold cache, during which the field is focusable. The only fix that collapses it to a single round trip is **issuing the challenge on the redirect itself** — in a cookie or the URL fragment. blue-eyed controls that redirect, so this is available to us and it interacts directly with the cross-domain protocol design in #45.

## Conditional create: a backend branch, not a frontend feature

`mediation: "conditional"` on `create()` silently upgrades a password user to a passkey with no modal UI. Chrome 136+ desktop, Safari 18+; not Firefox or Edge.

**The client MUST set both `requireUserPresence` and `requireUserVerification` to FALSE** for these ceremonies (§5.1.3). So registration verification must branch on ceremony type: a shared verifier that asserts `UP == true` will reject a conditionally-created credential even though the ceremony succeeded. This is a Go-side design constraint, and it is easy to get wrong precisely because it looks like a frontend concern.

## Hybrid / cross-device

- **Bluetooth is mandatory on both devices, plus internet on both.** The proximity proof is a BLE advert whose decryption yields the Noise handshake PSK. Without it the handshake never begins: the user sees a QR that has visibly been scanned and a desktop that hangs until timeout. There is no internet-only fallback in the spec, and JS cannot detect whether the radio is on. Keep a recovery path that does not need Bluetooth.
- **Hybrid never creates a credential on the desktop.** The phone is required on every login. To stop needing it, run a second registration ceremony on the desktop after the hybrid login succeeds, passing `excludeCredentials`.
- Desktops cannot act as hybrid *authenticators* — there is no "scan the QR with my Mac".
- `hints: ["hybrid"]` on an explicit "use my phone" button skips the dead-end dialog. Chrome/Edge 128+, Firefox per IDL; **not Safari**.

## Source conflicts worth knowing

MDN's compatibility data disagrees with browser source in several places relevant here: it records Safari as lacking `residentKey` and `credProps` (WebKit's IDL declares both) and Firefox as lacking `hints` (Firefox's IDL declares it). Trust the IDL. Separately, `isConditionalMediationAvailable()` is absent from WebKit trunk today, so feature-detect via `getClientCapabilities().conditionalGet` first and fall back to it only if missing.
