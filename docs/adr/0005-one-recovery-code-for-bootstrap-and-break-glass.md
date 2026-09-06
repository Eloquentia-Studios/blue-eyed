# One Recovery Code, for bootstrap and for break-glass

`blue-eyed recover`, run inside the container, prints a **Recovery Code**: a single-use one-time password, valid
for ten minutes, that authenticates the Owner. The same mechanism runs itself on a boot where no Owner exists,
printing a Recovery Code to the container log alongside the Blue Eyed Host URL. First run and last resort are
the same code path, and there is only one of them to get right.

ADR-0001 made this the *only* recovery path for the Owner's account, so it has to be designed to that standard.
It authenticates nothing on the way in, because it cannot: its authority is file access to the SQLite database,
which the command opens directly. That is not a weakness being tolerated. ADR-0001 already concedes that control
of the host outranks the record, and a recovery path that demanded a credential would be a recovery path for
people who still have one.

It emits a code rather than a link. A URL carrying a secret lands in browser history and in the link preview of
whatever chat application the operator pasted it into; a six-or-more character code typed into a login page does
neither.

The Recovery Code is **not a Credential**. It lives in its own single-row table, is consumed on use, and is
submitted through a login path distinct from the Password path. Modelling it as a password row would hand it
password login's entire surface — remote submission, the shared throttle counter, a line in the Credential list,
the standing "you still hold a Password" nudge — for no benefit. It is invalidated by the next `blue-eyed
recover` and by any successful login, so it does not sit around after the emergency it was minted for.

Redeeming it produces a Session with full management authority. We considered restricting it to a forced
enrollment screen — you are in, but the only thing you can do is enroll a Credential — which is better against a
leaked-and-redeemed code, since it could not quietly read the Service list. It was rejected as one more
half-authenticated state to build and reason about, in the one flow that must work at two in the morning. The
compensation is that the redemption is loud rather than quiet: a non-dismissible banner until a Credential is
enrolled, and a permanent audit row the admin UI surfaces. This is the one operation with no in-band
authorization, so it is the one that must be impossible to miss afterwards.

It is Owner-only. A CLI that could mint a login for any account would be a strictly larger backdoor for nothing:
ADR-0006 already gives the Owner a re-enrollment link for everyone else.

## First boot

On a boot with no Owner, blue-eyed generates a Recovery Code, prints it with the URL to reach, and does so again
on every subsequent boot until an Owner exists. It does not expire in that window. An instance with no Owner
holds no data worth protecting, and a ten-minute expiry would mean an operator who stepped away has to restart
the container to get back in.

Redeeming it lands on a first-run screen taking a Username, a Display Name, and a first Credential — a Passkey
where the Blue Eyed Host is `https://`, a Password in Insecure Mode, which ADR-0004 leaves optional and
deletable the moment something better exists. The Credential Policy floor defaults to one Factor and is not
asked about; an operator's first five minutes is not where policy is chosen.

A separate `blue-eyed bootstrap` command was the obvious alternative and fails on discovery: the operator sees a
running container and a login page they cannot pass, with nothing telling them a command exists.

## Consequences

- The Recovery Code has no network trigger and no HTTP endpoint. Exposing the container's ports does not expose
  it; exposing a shell does, and a shell was already total authority over the deployment. "What stops it being a
  backdoor if the container is exposed" answers itself.
- It works in Insecure Mode, where it matters most, since that is the deployment whose Owner may hold only a
  Password.
- The container log is now a secret-bearing artifact on first boot. An operator who pipes logs to a shared
  aggregator is publishing a Recovery Code, and the documentation has to say so where they will read it.
- A leaked and redeemed Recovery Code is an intruder with the Owner's full authority. The banner and the audit
  row are what make that discoverable rather than silent, and they are load-bearing rather than decorative.
- Nothing resets the Owner's Credentials, per ADR-0001. If the Owner's only Passkey is stranded by a Blue Eyed
  Host change, the instance is healthy and reachable by nobody, and this is the way back in — which is why
  ADR-0003 puts the command in the boot output alongside the count of Passkeys about to be invalidated.
