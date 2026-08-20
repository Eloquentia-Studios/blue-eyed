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
A named, flat set of Users. The primitive access is granted to. No hierarchy, no inheritance, no permissions
attached — the only thing a Group confers is reaching Services.
_Avoid_: Role, Team

**Credential**:
Something a User proves themselves with. Kinds: **Passkey** and **Password**. A User has zero or more; the
Password is one of them, not a property of the User.
_Avoid_: Authenticator, Factor, Login

**Enrollment**:
Adding a Credential to a User. Claiming an Invitation is the first one; adding a passkey a year later is the
same operation, differing only in what authorized the request.
_Avoid_: Registration — OIDC uses that for clients.

**Invitation**:
A standalone record holding what the Owner pre-set for someone who does not exist yet. Claiming it creates
the User; it is never itself a User, and expiring unclaimed leaves no trace.

**Disabled**:
A flag on a User who keeps their identity, Groups and Credentials but authenticates no further; every Session
and Pass they hold dies with it. The reversible alternative to deletion.

### Access

**Service**:
Something a User is granted access to, named by a human ("Gitea"). One Service, one grant, however many ways
it is reachable.

**Client**:
A concrete way a Service is reached. Two kinds: **OIDC Client** and **Forward-Auth Client**. A Service has
one or more; a Service with none is unreachable.
_Note_: unqualified "Client" is forbidden wherever both planes are in play — OIDC's own `client_id` means
only the OIDC kind, and that ambiguity is not survivable there.

**Protected Host**:
A hostname blue-eyed gates on behalf of a Forward-Auth Client, identified by the host alone. Never a
registrable domain — a Pass must never reach a host blue-eyed does not gate.
_Avoid_: Protected Domain, Protected Origin

**Blue Eyed Host**:
The one hostname blue-eyed itself answers on. Every Session, passkey RP ID, OIDC `issuer` and redirect belongs
to it, and there is exactly one.
_Avoid_: Canonical origin, auth domain

### Sessions

**Session**:
The authenticated state at the Blue Eyed Host, created by logging in. The root of trust every other artifact
derives from.

**Voucher**:
The single-use, short-lived token carried in a redirect from blue-eyed to a Protected Host, exchanged there
for a Pass. Carries nothing that outlives the round trip.
_Avoid_: Grant — OAuth2 owns that word here. Also: Ticket, Token.

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
