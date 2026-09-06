# Issue tracker: Linear

Issues and specs for this repo live in **Linear**, in the **Blue Eyed** project on the **Engineering** team (key `ENG`) of the **Eloquentia Studios** workspace — <https://linear.app/eloquentia-studios/project/blue-eyed-07cf57073d64>. Drive it through the Linear MCP connector.

The Engineering team may carry work for other repos, so the **project is the repo's boundary**: every issue this repo's skills create belongs to `Blue Eyed`, and every query they run is scoped to it. An unscoped `list_issues` will return other repos' work.

Linear addresses issues by team-prefixed key (`ENG-42`), never by bare number. Write keys in full so they stay resolvable outside this repo.

The connector's tools are exposed under an opaque server prefix, so match them by bare name (`save_issue`, `list_issues`, …) rather than by a hardcoded `mcp__linear__*` prefix. If none are available, the connector isn't authenticated — say so rather than falling back to `gh issue`.

## Conventions

Linear's MCP surface is **save-shaped**: one `save_*` tool per entity handles both create and update. Passing `id` updates; omitting it creates.

- **Create an issue**: `save_issue` with `team: "Engineering"`, `project: "Blue Eyed"`, `title`, and `description` (Markdown, literal newlines — do not escape). The `project` is not optional — an issue created without it lands in the team's backlog outside this repo's boundary.
- **Update an issue**: `save_issue` with `id` set to the key (`ENG-42`). For a large description edit, prefer `patch` over resending the whole body.
- **Read an issue**: `get_issue` on the key for the body, `list_comments` for the discussion. Fetch both before acting on a ticket. Pass `includeRelations: true` when blockers matter.
- **List issues**: `list_issues` with `project: "Blue Eyed"`, further filtered by `state`, `label`, `assignee`, or `parentId`. Pass `fields` to select only what you need. Prefer a filtered query over listing everything and discarding.
- **Comment on an issue**: `save_comment` with `issueId` and `body`. Reply into a thread with `parentId` instead.
- **Apply / remove labels**: `save_issue` with `addLabels` / `removeLabels`. Both are incremental, so there is no read-modify-write — do **not** send the `labels` array, which replaces the whole set and silently drops labels you didn't list.
- **Close**: `save_issue` with `state: "Done"`. Linear has no separate close verb; leave a comment first when the resolution needs explaining.

Engineering's states are `Backlog`, `Todo`, `In Progress`, `Done`, `Canceled`, and `Duplicate`. "Open" means anything whose status type is not `completed` or `canceled`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

Code review still happens on GitHub — `Eloquentia-Studios/blue-eyed`, via the `gh` CLI. That split is deliberate: Linear owns intent, GitHub owns code. `get_issue` returns a `gitBranchName` (e.g. `esaias/eng-2-connect-your-tools`); branch from that name and Linear's GitHub integration links the PR back to its issue automatically.

## When a skill says "publish to the issue tracker"

Create a Linear issue in the `Blue Eyed` project on the Engineering team.

## When a skill says "fetch the relevant ticket"

`get_issue` on the key, then `list_comments` on the same issue.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **sub-issues** as tickets.

- **Map**: one issue in the `Blue Eyed` project labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. Set `project` explicitly on every child as well, rather than relying on inheritance from the parent.
- **Child ticket**: `save_issue` with `parentId` set to the map's key — Linear's native sub-issue relationship, visible in the map's sub-issue list and progress count. Label it `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`). Once claimed, assign it to the driving dev.
- **Blocking**: `save_issue` with `blockedBy` (append-only; `removeBlockedBy` to undo) creates Linear's native issue relation — the canonical, UI-visible representation. Read it back with `get_issue` and `includeRelations: true`. A ticket is unblocked when every blocker sits in a `completed` or `canceled` state.
- **Frontier query**: `list_issues` with `parentId` set to the map, keeping open states; drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: `save_issue` with `assignee: "me"`. This is the session's first write.
- **Resolve**: `save_comment` with the answer, `save_issue` with `state: "Done"`, then append a context pointer to the map's Decisions-so-far section with a `patch`.
