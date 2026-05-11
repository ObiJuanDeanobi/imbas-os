# Documentation readiness for public 1.0

Public 1.0 requires a docs library that a new human and a new AI agent can use without private chat history, hidden VPS state, or tribal knowledge.

## Gate rule

Do not mark Imbas OS public-ready until the documentation library has been tested during the fresh-system gate.

## Required doc set

### Canonical README and AI context docs

- Root `README.md` as the single GitHub entrypoint, readable by humans and parseable by AI.
- `llms.txt` as a concise AI sitemap/context map.
- `llms-full.txt` as a fuller context bundle of crucial docs.
- `AGENTS.md` as operational rules for autonomous coding agents.
- `skill.md` as actionable workflow instructions.
- Local install/setup.
- Desktop user guide.
- Android companion setup/use guide.
- Backup/restore/delete/forget guide.
- Troubleshooting guide.
- Security/privacy model.
- Release notes/known limitations.
- Connector protocol/API reference.
- Context pack and memory governance docs.
- Module-specific contracts for Memsocket, Lorekeeper, Conduit, Runledger, Sanctum, Artifact Vault, Android, and Desktop.

### Operator/release docs

- Verification gates.
- Fresh-system gate checklist.
- Rollback/recovery plan.
- Private-preview package restore procedure.
- Public release approval checklist.

## Quality bar

Docs must be:

- source-backed by current repo behavior;
- explicit about private-preview versus public-ready;
- runnable from a clean checkout where possible;
- clear about required approvals and dangerous actions;
- searchable with stable terms like Imbas OS, Memsocket, Conduit, Lorekeeper, Runledger, Sanctum, Artifact Vault, OpenClaw, Hermes, Codex, Claude Code, context pack, and local-first AI memory.

## Fresh-system doc test

During the fresh-system gate, a tester should be able to follow docs to:

1. install/run Imbas OS;
2. run verification;
3. pair Android;
4. connect a fresh OpenClaw profile;
5. create/save an artifact;
6. propose/apply/reject Lorekeeper changes;
7. inspect Runledger evidence;
8. backup/restore into a clean target;
9. understand what remains private-preview only.

Any undocumented step becomes either a doc bug or a product bug.


## Dual-surface readiness

Before public 1.0, each core subsystem must expose both human-readable and AI-operable surfaces over the same source of truth. Record gaps as product or docs bugs.

For each subsystem — Memsocket, Artifact Vault, Lorekeeper, Conduit, Runledger, Sanctum, Atlas, SyncCore, Desktop, Mobile, and CLI — verify:

- stable source-of-truth storage or API contract;
- human surface for reading, reviewing, approving, troubleshooting, or undoing;
- AI surface such as structured JSON, context pack, `llms` entry, workflow instruction, connector API, or export;
- provenance/source refs;
- trust/sensitivity policy;
- rollback/snapshot/reject/revoke/forget path;
- verification gate proving the human and AI surfaces still correspond.

`llms-full.txt` must be generated from source docs with `npm run docs:llms`, and CI/local verification must pass `npm run docs:llms:check`.
