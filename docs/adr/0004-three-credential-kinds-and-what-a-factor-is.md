# Three Credential kinds, and what a Factor is

A Credential is a row. blue-eyed has three kinds — **Passkey**, **Password** and **TOTP** — and each is stored
as a thin core record (id, User, kind, label, created and last-used timestamps) joined to one typed side table
per kind. Adding a fourth kind is a `CREATE TABLE`, not a migration of anything that already exists, which is
what "pluggable credential" was asking for. Every generic operation — the Credential list, "what does this User
hold", the policy check — reads the core table and never needs to know what a kind stores.

We rejected a single table with a JSON blob, because `go-webauthn` is explicit that credentials want typed,
indexable, constrainable columns and a blob throws that away. We rejected one wide table with the union of every
kind's columns, because nothing then stops a password row carrying an AAGUID, and the constraint that would stop
it is the side table we declined to write. The WebAuthn user handle is a per-User value on `users`, not per
Credential, so every Passkey a User holds resolves to one identity.

The Password is one of the three, not a property of a User. It is optional per User, always offered, and never
required by blue-eyed itself. This is not a concession to Insecure Mode but the reason for it: on an `http://`
Blue Eyed Host the Password is the only kind that functions, so a fresh deployment's Owner necessarily has one,
and ADR-0003 already refused to make that permanent. The moment TLS lands they enroll a Passkey and delete it.
A per-instance "passwords are off" switch was rejected for the same reason ADR-0003 gives: it strands every User
the day the host goes insecure.

## What a Factor is

A **Factor** is a Credential *kind*, not a Credential. Two Passkeys is one Factor — otherwise a User with a
laptop passkey and a phone passkey satisfies a two-factor requirement by presenting the laptop twice.

A Passkey counts as **two** Factors, because unlocking it required both the authenticator and the PIN or
biometric that released it. That is only true when user verification actually happened, so blue-eyed sets
`userVerification: "required"` on every ceremony *and* reads the UV bit out of that ceremony's own authenticator
data before crediting the second Factor. The stored `UserVerified` flag is the spec's latched `uvInitialized`:
once any assertion has verified the user it stays true forever, so reading the record would pass a UV-less login
as two-factor. `userVerification: "preferred"` was rejected — it makes "a Passkey signs you in under a
two-factor policy" conditional on device behaviour the User cannot see.

Any kind can establish a Session on its own, TOTP included. A **Credential Policy** raises that bar: the
deployment carries a minimum Factor count, defaulting to one, and a User may demand more of themselves but never
less. That is the only arrangement where the Owner's floor means something and the User keeps agency, and it
needs no conflict resolution. Any two distinct kinds satisfy a floor of two; there are no privileged
combinations.

## Functioning Credentials, and being Locked Out

A Credential functions or it does not, and for a Passkey that is a fact about the deployment rather than the
record: it does not function in Insecure Mode, and it does not function once its RP ID stops matching the Blue
Eyed Host. So the rule guarding deletion counts functioning Credentials and reads as a transition — **a delete
is refused only when it would take a User from exactly one functioning Credential to zero.** Already at zero,
deletion is free, which is how a Stranded Passkey that is someone's only Credential can still be cleared away.

Insecure Mode therefore refuses deletes that would otherwise succeed: a User holding a Passkey and a Password on
an `http://` host cannot delete the Password. That is the invariant working, but the refusal has to say *why* —
"your Passkey cannot be used at this deployment's current address" — or it reads as a bug.

Zero-credential Users are a state blue-eyed handles rather than an invariant it defends. The UI will not create
one; a sweep, an Owner's reset, or direct SQL can. A User with no functioning Credential is **Locked Out**: a
derived state, never stored, listed in the admin UI and counted by the boot warning ADR-0003 already requires.
Locked Out is not Disabled and not Throttled, and those three must not share a word in the UI.

## Consequences

- A TOTP secret has to be stored recoverably, unlike a password hash, so a read of the SQLite file yields
  working logins for every User holding one. It is encrypted at rest with a key supplied by environment variable
  or a file outside the database. This is the direct cost of letting TOTP stand alone and it is paid explicitly.
- Throttling stops being a nicety. `username` plus six digits is a complete login, so blue-eyed keeps one
  attempt counter per User shared across every phishable kind — password failures and TOTP failures increment
  the same number — with exponential backoff and no permanent lockout, since a permanent lock is a
  denial-of-service any stranger can aim at the Owner on a box with no email to undo it. A User in backoff is
  **Throttled**. A TOTP code is single-use within its window, replay-rejected by storing the last accepted step,
  so one shoulder-surf is not reusable for thirty seconds.
- The login page presents only the kinds the named User actually holds, which makes Username existence
  discoverable to anyone who can reach the login page, along with which of those Users have no Password. For a
  household that is an acceptable trade. For an internet-facing deployment it is the first thing an attacker
  enumerates, and it is a deliberate choice rather than an oversight.
- ADR-0003's rule that no Credential Policy may be enforceable while the Blue Eyed Host makes it unsatisfiable
  lands here as: a requirement that every User hold a Passkey cannot be enabled in Insecure Mode and suspends
  itself with a banner if the host later becomes insecure. A Factor floor of two survives Insecure Mode, because
  Password plus TOTP satisfies it. Enabling any policy shows the Owner the list of Users who currently fail it
  before they confirm, and a User who fails a newly enabled policy keeps their Session and is forced into
  enrollment at the next login rather than being disabled.
- TOTP is enrollable in Insecure Mode, since nothing about it depends on the hostname. Both the enrollment
  secret and every code cross the wire in cleartext there, so a TOTP requirement on an `http://` host buys less
  than its name suggests.
- Stranded Passkeys are deleted 90 days after the mismatch is first observed, swept at boot rather than on a
  timer because this is one container with no scheduler and the mismatch is only ever observed at boot anyway.
  A User enrolling a new Passkey clears their own stranded ones immediately, and the Owner may delete any of
  theirs at any time. Nothing is swept in Insecure Mode, as ADR-0003 requires. A stranded Credential is swept
  even when it is a User's last one: it does not function, so that User is already Locked Out.
- A Credential is never Disabled. Disabled stays a flag on a User, and a Credential you no longer want is
  deleted. One state fewer, and nothing wants a present-but-dead Credential that is not already a Stranded
  Passkey.
- blue-eyed emits `acr` honestly on the protocol plane — `phrh` for a device-bound Passkey, `phr` for a synced
  one, neither for Password or TOTP — so an OIDC Client that cares can ask. `amr` is left alone: the IANA
  registry has no value meaning "passkey" and inventing one is worse than silence. This is a truthful report,
  not a privilege distinction; blue-eyed itself treats every Session as equal (see ADR-0006).
- Attestation is `none` and discoverable credentials are required, both settled by the passkey research rather
  than here. The AAGUID is kept to label a Credential with the provider's name, and blue-eyed is honest that an
  unattested AAGUID is self-reported.
