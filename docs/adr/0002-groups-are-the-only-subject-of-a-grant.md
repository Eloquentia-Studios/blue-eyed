# Groups are the only subject of a Grant

A **Grant** binds a **Group** to a **Service**. Nothing else can hold one. There is no way to give a single
User access to a single Service without first putting that User in a Group, and there are no deny rules, so
a User reaches a Service exactly when some Group they belong to holds a Grant on it. Everything else is
refused.

The obvious alternative was a Grant whose subject is either a User or a Group, one nullable column, which
would have spared a two-person household the pile of one-member Groups it now has to create. We rejected it
because the second subject type buys convenience and costs an invariant. With one subject there is exactly
one query that answers "may this User reach this Service", exactly one screen that answers "why can Alice
reach this", and exactly one place to look when the answer is wrong. Two subject types means every one of
those grows a second branch, and the ergonomic win only exists at the smallest scale, where making a Group
is a few seconds of typing.

The absence of deny rules is the same argument. Deny earns its place when there is a hierarchy to carve
exceptions out of, and a flat set of Users has none. Without deny there is no precedence to define, no
conflict to resolve, and no case where an explicit allow silently loses.

## Consequences

- A household with ten Services and non-uniform access ends up with roughly ten Groups, several of them
  holding one person. Creating a Group has to be cheap and inline wherever a Grant is created, or the model
  is correct and unusable.
- "Everyone may reach this" cannot be a hand-maintained Group without a footgun, since the day someone
  forgets to add a new User the denial looks like a bug. Hence the **Everyone** Group: fixed, underivable
  from anything but being a User, and not editable.
- Removing access is removing a Grant or a membership. There is no way to express "everyone in this Group
  except her", and the answer to that requirement is a different Group, not a new rule type.
- Every check is `(User, Service) -> allowed`, evaluated live. On the forward-auth path it runs on every
  request alongside Pass validation, so a membership change takes effect on the next page load. On the OIDC
  path it runs at `/authorize` and again at `/token`, and once more on every refresh, so revocation there
  lags by at most one access token lifetime. That asymmetry is inherent to bearer tokens, not a shortcut.
- The Owner gains no Service access from the office. They reach a Service through Everyone or through a
  Group they put themselves in, like any other User. ADR-0001 governs the management plane, which is not a
  Service and therefore cannot be locked away by any arrangement of Grants.
- "Grant" was a banned word when the vocabulary was seeded, reserved against calling a Voucher one. It is
  now taken by this record, and the ban points the other way. OIDC's `grant_type` will sit beside it in the
  protocol-plane code, and unqualified "grant" is ambiguous there.
