# Lorekeeper review workflow

Lorekeeper is the living wiki review loop. It should make durable knowledge changes inspectable, reversible, and auditable.

## Core rule

Do not silently mutate human-owned wiki content. Propose first, preview/diff, approve, then apply only inside managed blocks or explicitly owned pages.

## Proposal flow

1. Create a proposal with title, markdown, rationale, target page, and sources.
2. Review rationale, markdown preview, and sources.
3. Approve or reject the proposal.
4. Preview before/after diff.
5. Apply only after approval.
6. Write Runledger audit entry.

## Apply behavior

Apply requires:

- approved proposal status;
- `wiki:pages/*.md` target page;
- at least one source citation;
- managed block boundaries.

Lorekeeper writes only inside markers like:

```markdown
<!-- IMBAS:LOREKEEPER:BEGIN proposal-slug -->
Managed content here.
<!-- IMBAS:LOREKEEPER:END proposal-slug -->
```

Human-owned content outside managed blocks should be preserved.

## Snapshot behavior

Before applying a managed block change, Lorekeeper writes an on-disk Markdown snapshot under `.snapshots/...`.

Desktop review can:

- list snapshots;
- preview snapshot markdown;
- restore a snapshot with explicit `RESTORE` confirmation;
- create a safety snapshot before restore;
- record Runledger audit entries.

## Android role

Android can approve/reject proposals through scoped mobile actions. Android does not apply or restore pages directly.

## Future tiered automation lanes

Planned policy lanes:

- **Auto-propose**: agent can create proposals for review.
- **Low-risk auto-apply**: only for explicitly managed blocks and policy-approved sources.
- **Approval-required**: changes touching durable project knowledge, migration state, security, release notes, or cross-module decisions.
- **Blocked**: destructive, external, secret-bearing, or trust-boundary changes without explicit human approval.
