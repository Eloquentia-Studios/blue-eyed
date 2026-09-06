# Enrollment is one link, whether you exist yet or not

Onboarding someone new and restoring someone locked out are the same operation pointed at different subjects.
The Owner generates a single-use, short-lived link; whoever opens it performs an Enrollment. Against an
Invitation the claim creates a User first. Against an existing User it does not. Everything else — the
generation, the delivery by hand, the single use, the expiry — is shared, and so is the code.

## Invitations

An **Invitation** is a standalone record holding what the Owner pre-set for someone who does not exist yet. The
Owner sets the Groups and a **nickname**: a free-text label, never shown to the invitee, that exists so the
pending-invitations list is legible and so a claim can be attributed after the fact. Without it the Owner sees
three unclaimed invitations with nothing to tell them apart, and a forwarded link is unattributable.

The invitee chooses their own Username and Display Name. The Username is validated and reserved *before* the
credential ceremony starts, not after — a collision discovered afterwards means the invitee has burned a passkey
enrollment on a claim that then fails, with no Owner present to fix it.

Groups are the Owner's to set because ADR-0002 makes Group membership the only route to any access. An invitee
choosing their own Groups would be choosing their own authorization.

An Invitation is single-use with a seven-day TTL. It is deleted on claim and swept on expiry, so an unclaimed
one leaves no trace. Multi-use links — "anyone with this link may join" — are refused outright: an unclaimed
multi-use link is an unbounded account-creation grant sitting in someone's chat history, in a product whose
premise is one person deciding who gets in.

blue-eyed holds no email address for anyone and requires no SMTP, so the Owner hands the link over by whatever
means they already use. The secret is in the URL, which puts it in browser history and in link previews; a
two-part flow of URL plus a separately-spoken code was considered and rejected, because in a household passing a
link over a chat application one of the two parts gets lost.

## What the Owner may do to someone else's Credentials

Delete, and issue a re-enrollment link. Never read, never set.

The Owner cannot set a Password to a value they know, because a Credential the Owner has seen is a Credential
the Owner can use, and "the Owner impersonated a User" is not an operation this product offers. The honest
asterisk is that this restrains nobody: the Owner has the database file and the container. What it buys is that
an ordinary reset does not quietly hand the Owner a working login to somebody else's account as a side effect.

A reset is atomic rather than delete-then-invite, because ADR-0004 refuses a delete that would take a User from
one functioning Credential to zero. The Owner issues the re-enrollment link, and the Credential being replaced is
deleted when the link is claimed.

None of this reaches the Owner's own account. ADR-0001 puts their Credentials beyond anyone's reset, and
ADR-0005 is the only way back.

## Re-authentication

blue-eyed makes no privilege distinction between Sessions: a Password login and a Passkey login carry the same
authority, and there is no step-up. The reasoning is that the relative rule needed to make a downgrade safe —
demand better only when the User holds better and could use it here — is real complexity bought to defend
against a threat that a household deployment does not have, and the absolute rule locks the Owner out of their
own admin UI on every pre-TLS deployment.

Recency is a different question and does get enforced. Three operations demand a credential presentation within
the last few minutes regardless of how the Session was established:

- mutating your own Credentials — enrolling, deleting, changing a Password, enrolling TOTP,
- editing another User's Credentials,
- deleting an account.

The threat is a Session left open on a shared laptop, not a weak credential. Nothing else is gated. Gating
Grant creation while leaving Service registration open would be theatre, since the Owner's Session already
carries total authority over both. Nothing is gated on the forward-auth plane, where a Pass has no way to carry
the notion.

## Consequences

- Two entry points, one enrollment implementation. A bug in the claim flow is one bug, and the Invitation's only
  extra step is creating the User.
- The Owner can lock someone out by deleting Credentials, and the recovery is the link, delivered by hand. There
  is no self-service reset, because there is no email to send one to.
- A User who claims an Invitation picks a Username the Owner never saw. The nickname is what the Owner recognises
  them by until they do, and the two are not reconciled afterwards — the nickname is a label on a record that no
  longer exists once the claim succeeds.
- Re-authentication needs every Credential kind to be presentable outside of login, which is a second, smaller
  ceremony surface rather than a reuse of the login page.
