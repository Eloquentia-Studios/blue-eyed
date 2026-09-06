# Exactly one Blue Eyed Host

blue-eyed answers on one hostname, configured by environment variable as the public origin a browser sees.
That one value derives the passkey RP ID, the WebAuthn expected-origin check, the OIDC `issuer` and every URL
in the discovery document, the Session cookie domain, and the absolute `Location` blue-eyed emits on the
forward-auth path. There is no second knob: the RP ID is that hostname exactly, never its registrable parent.
Reaching blue-eyed itself under a second name — `auth.home.lan` on the LAN and `auth.example.com` through a
tunnel — is **not supported**, and blue-eyed says so out loud rather than letting the operator find out when a
passkey stops working.

The constraint is WebAuthn's. A credential stores the SHA-256 of the RP ID at registration and returns it in
every assertion; there is no field to change it and no ceremony that rewrites it. An RP ID must be a
registrable domain suffix of the origin running the ceremony, so no single value covers two unrelated apexes.
`docs/research/passkeys-multi-domain.md` establishes this and closes the escape hatches: Related Origin
Requests has the client fetch `https://<rpid>/.well-known/webauthn`, which in a split-horizon deployment is
precisely the host that is unreachable from where the user is standing, and no migration path exists in
Level 3 or in FIDO's credential-exchange work to move a credential from one RP ID to another.

We considered serving a second hostname with passkeys degraded to Password there, which is the same shape one
hostname short of supporting the split. It is a strictly larger surface — a second origin minting Sessions,
Vouchers and tokens — and it makes an `issuer` mismatch a *supported* configuration, which surfaces as a
broken app rather than a broken login. We also considered an RP ID per hostname, treating credentials as
scoped to an access path. It is the only option that actually works for LAN-plus-tunnel, and we rejected it
because a User's passkey list becomes a per-network list they have to reason about, in a product whose whole
claim is that one login reaches everything. The operator's remote-access story is to put the tunnel behind
the same name: split-horizon DNS, or a mesh network serving the Blue Eyed Host.

The same single-origin pressure applies to the OIDC `issuer`, which must match exactly and is baked into
discovery and every issued token. It does **not** apply to OIDC Client redirect URIs, which point at the
app's own host and are validated by exact match against what was registered. Nor does it constrain protected
services: a service reachable at two names is two Protected Hosts pointing at one Service, two Passes, and no
WebAuthn anywhere near it. Both look like they should follow from this decision and neither does.

## Host rules, per endpoint

There is no single set of acceptable hostnames, because the three endpoint classes learn the hostname from
different places.

- **Browser-facing endpoints** require the `Host` header to equal the Blue Eyed Host. Anything else is
  rejected outright, with a body naming the configured value. No redirect to the canonical name: a request on
  the wrong hostname is an operator error, and saying so is the point.
- **The Redemption Endpoint** requires the `Host` to be a registered Protected Host, since it is routed to
  blue-eyed from every Protected Host by design.
- **The forward-auth endpoint** ignores `Host` entirely. Traefik calls it at blue-eyed's internal address, so
  the header is a container name; the Protected Host arrives in `X-Forwarded-Host`. That header is untrusted
  input — with `trustForwardHeader: true` a client dictates it — so it is matched against registered Protected
  Hosts and fails closed on no match, never falling back to anything.

## Insecure Mode

An `http://` Blue Eyed Host is allowed behind an explicit flag, and relaxes hostname validation with it: IP
literals and bare labels become legal, because there is no RP ID left to protect. This is the ordinary
homelab first boot — `http://192.168.1.10:8080`, no TLS yet — and refusing it would only push the operator
into a hostname they have to change again later. Passkeys are unavailable deployment-wide, greyed in the UI
with the reason and the fix stated, and Password is the only Credential kind that functions. Password-only is
a supported configuration, not a transitional ramp: you cannot tell a homelab from production, and pretending
otherwise would make the honest state the undocumented one.

## Consequences

- Changing the Blue Eyed Host boots anyway, warns loudly, and strands every Passkey. blue-eyed does not
  refuse to boot: a domain genuinely moving is a real thing in a homelab, and a boot failure traps the
  operator with nothing but a SQLite editor. Each Passkey carries its RP ID and is stamped Stranded at the
  first boot where the mismatch is observed, so restoring the previous value inside the retention window
  un-strands it. Re-enrollment is the only other route; there is no migration.
- If the Owner's own passkey is stranded, the instance is running, healthy, and reachable by nobody. CLI
  break-glass is the recovery, as ADR-0001 already requires, and the boot output carries the command with the
  count of Passkeys about to be invalidated. We rejected forcing the Owner to hold a Password at bootstrap:
  a permanent phishable credential on the one account with total management authority is a worse standing
  cost than a rare, operator-initiated recovery.
- Stranded Passkeys are never swept in Insecure Mode. There is no current RP ID to compare against, so
  nothing is provably stale, and an operator who spends an afternoon without TLS must not come back to empty
  Credential lists.
- No credential policy may be enforceable that the current Blue Eyed Host makes unsatisfiable. A requirement
  that every User hold a Passkey cannot be enabled while the host is insecure, and is suspended with a banner
  if the host later becomes so. The credential and enrollment model inherits this as a constraint rather than
  discovering it as a bug.
- blue-eyed detects what it can and no more. It validates the configured value at startup and self-checks by
  resolving and fetching its own discovery document, which catches the classic case of a public name that
  does not resolve from inside the container network. A request arriving with an unrecognised hostname is
  evidence of a second name and raises both a log line and a dismissible banner in the admin UI — the log
  line alone is worthless, since nobody reads container logs until something is already broken. What it
  cannot detect is a second name that never sends traffic.
- The Blue Eyed Host must resolve, and terminate correctly, from every network any User or any Client stands
  on: phone on cellular, laptop on the LAN, and the OIDC Client container doing server-side discovery on the
  Docker bridge. Split-horizon DNS is the documented pattern. An internal alias serving discovery under a
  second name is multi-homing wearing a hat and is not offered.
- The environment variable is the public origin, not the listening socket. Terminating TLS at a reverse proxy
  and running blue-eyed plaintext behind it is the normal topology and was never in tension with `https://`.
- The Session cookie is host-only. With no sibling hostnames to share it with, a `Domain` attribute would
  widen the cookie's reach for nothing.
