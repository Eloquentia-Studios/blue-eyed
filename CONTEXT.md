# blue-eyed

An authentication provider for small self-hosted setups — a household, a homelab, a two-person studio. It
owns its users outright and gates access to services two ways: as an OIDC Provider, and as a Traefik
forward-auth endpoint. This file is the glossary the spec and every ADR speak in. It holds no
implementation detail.

## Language

### People

**User**:
A human who can be authenticated by blue-eyed. The account itself, independent of how many ways they can
prove who they are — two passkeys is one User.
_Avoid_: Identity, Principal, Account

**Owner**:
The single User who runs the deployment. An office, not a permission level: there is always exactly one, no
operation adds a second or leaves none, and it never moves — the Owner is whoever bootstrap made it. Carries
total authority over the management plane and no implicit access to any Service. Every other User is a plain
User with no management ability whatsoever.
_Avoid_: Admin, Operator, Superuser, Root

**Username**:
The unique, required, always-lowercase, space-free name a User logs in with. Stable by policy, not immutable
by design.

**Display Name**:
The free-text name a User is shown by. Capitals and spaces allowed, no uniqueness, cosmetic. blue-eyed holds
no email address for anyone.

**Group**:
A named, flat set of Users. The only thing a Grant binds: access is never given to a User directly, so
granting one person one Service means putting them in a Group of their own. No hierarchy, no inheritance, no
permissions attached — the only thing a Group confers is reaching Services.
_Avoid_: Role, Team

**Everyone**:
The one Group holding every User, the Owner included. Created at bootstrap, it cannot be renamed, deleted, or
edited, and its membership follows from being a User rather than being stored, so it is never out of date.
Granting a Service to Everyone is how "anyone who can log in may reach this" is written down. The Owner's
membership is not implicit access: it is an ordinary Grant on an ordinary Group, visible as such. A Service
everyone but one person may reach needs a hand-maintained Group instead.

**Credential**:
Something a User proves themselves with. Kinds: **Passkey** and **Password**. A User has zero or more; the
Password is one of them, not a property of the User.
_Avoid_: Authenticator, Factor, Login

**Enrollment**:
Adding a Credential to a User. Claiming an Invitation is the first one; adding a passkey a year later is the
same operation, differing only in what authorized the request.
_Avoid_: Registration — OIDC uses that for clients.

**Stranded Passkey**:
A Passkey enrolled against a hostname this deployment no longer answers to, its RP ID frozen at Enrollment
and no longer the Blue Eyed Host's. It cannot authenticate; it is shown as such, with the hostname it was
enrolled for, and is eventually deleted. Restoring the previous Blue Eyed Host un-strands it, and once it is
deleted the only way back is a fresh Enrollment.
Nothing a User or the Owner did causes this — it is a fact about the deployment, not a decision about the
Credential, which is what separates it from Disabled.
_Avoid_: Orphaned, Expired, Dead, Revoked

**Invitation**:
A standalone record holding what the Owner pre-set for someone who does not exist yet. Claiming it creates
the User; it is never itself a User, and expiring unclaimed leaves no trace.

**Disabled**:
A flag on a User who keeps their identity, Groups and Credentials but authenticates no further; every Session
and Pass they hold dies with it. The reversible alternative to deletion.

### Access

**Service**:
Something a User is granted access to, named by a human ("Gitea"). One Service, one Grant, however many
Clients reach it.

**Grant**:
A binding of one Group to one Service, conferring access to every Client of that Service. It has no
attributes, no expiry and no conditions: it exists or it does not. A User reaches a Service exactly when some
Group they belong to holds a Grant on it, and nothing anywhere denies access, so no two rules can ever
conflict. Deleting the Group or the Service deletes the Grant.
_Note_: OIDC's "authorization grant" is an unrelated thing on the protocol plane and never appears
unqualified. A Voucher is never a Grant.

**Client**:
A concrete way a Service is reached. Two kinds: **OIDC Client** and **Forward-Auth Client**. A Service has
one or more; a Service with none is unreachable.
_Note_: unqualified "Client" is forbidden wherever both planes are in play — OIDC's own `client_id` means
only the OIDC kind, and that ambiguity is not survivable there.

**Protected Host**:
A hostname blue-eyed gates on behalf of a Forward-Auth Client, identified by the host alone: compared whole
and case-folded, with any port ignored and no wildcard or suffix matching. One hostname belongs to one
Service. Never a registrable domain — a Pass must never reach a host blue-eyed does not gate.
_Avoid_: Protected Domain, Protected Origin

**Blue Eyed Host**:
The one hostname blue-eyed itself answers on, configured at the deployment as the public origin a browser
sees. There is exactly one, and it derives the passkey RP ID, the OIDC `issuer` and every URL in discovery,
the Session cookie's host, and the absolute redirects blue-eyed emits. Reaching blue-eyed under a second name
is unsupported. Changing it leaves every Passkey a Stranded Passkey. It says nothing about an OIDC Client's
redirect URIs, and nothing about how many names a Service is reachable at.
_Avoid_: Canonical origin, auth domain

**Insecure Mode**:
A deployment whose Blue Eyed Host is an `http://` origin, which WebAuthn's secure-context rules make
impossible to run a ceremony at. Passkeys are unavailable to everyone for as long as it lasts — not Stranded,
since nothing about them has changed — and Password is the only Credential kind that functions. A supported
configuration, not a broken one, and the ordinary state of a deployment that has not set up TLS yet.
_Avoid_: Password-only mode, Passkeyless, Dev mode

### Sessions

**Session**:
The authenticated state at the Blue Eyed Host, created by logging in. The root of trust every other artifact
derives from.

**Voucher**:
The single-use, short-lived token carried in a redirect from blue-eyed to a Protected Host, exchanged there
for a Pass. Carries nothing that outlives the round trip.
_Avoid_: Grant, which names the access binding here. Also: Ticket, Token.

**Pass**:
The derived state that lets requests through on one Protected Host, backed by a cookie there and a record on
the server. One per Session per Protected Host. Never called a session.
_Avoid_: Domain session, local session

**Redemption Endpoint**:
The reserved path `/.blue-eyed/redeem` on every Protected Host, routed to blue-eyed by the Owner, where a
Voucher is exchanged for a Pass.
_Avoid_: Callback — that is OIDC's `redirect_uri`, a different thing on a different plane.

### Planes

**Management plane**:
Users, Groups, Services, Invitations, Sessions. Described by the OpenAPI spec, consumed by the admin UI,
reachable only by the Owner.

**Protocol plane**:
The OIDC endpoints and the forward-auth endpoint. Fixed external contracts, not OpenAPI-described.

### Other

**SSO**:
One login at blue-eyed serving many Services. Describes the outcome, not any component — no artifact is named
after it.

## Boundaries of this glossary

Control of the host — the container, its configuration, the SQLite file — is an authority blue-eyed cannot
represent or restrain. It is assumed to belong to the Owner, but anyone holding it has the Owner's power
whether or not they hold the record. Obligations placed on "the Owner" in operator-facing docs mean this
authority, not the database row.
