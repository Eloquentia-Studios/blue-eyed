# A single, non-transferable Owner

blue-eyed's management plane — inviting Users, registering Services, editing Groups, resetting Credentials —
is reachable by exactly one User, the **Owner**. The office is created at bootstrap and never moves: nothing
adds a second Owner, nothing leaves zero, and there is no transfer. Every other User is a plain User with no
management ability at all. We chose this over a flat `admin` flag several Users could hold, because blue-eyed's
audience is a household or a homelab where one person runs the box, and the Owner is assumed to be that same
person — the one with shell access, which is an authority blue-eyed could never restrain anyway. A permission
tier that only ever has one member is a tier not worth building.

## Consequences

- The Owner's User cannot be deleted or disabled, and no one else can reset their Credentials — any of those
  would leave the instance with no reachable management plane.
- CLI break-glass is therefore not a rarely-used backstop but the **only** recovery path for the Owner's
  account. It has to be designed to that standard.
- Control of the host outranks the record. Two people with SSH both hold the Owner's power while only one holds
  the flag; operator-facing docs saying "the Owner must…" mean the authority, not the row.
- A second person cannot be given management ability without changing this decision. The workaround a household
  will otherwise reach for is sharing the Owner's login, which is worse.
