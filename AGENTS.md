# AGENTS.md — Imbas OS

This repo is designed to be worked on by AI agents as well as humans.

## What Imbas OS is

Imbas OS is a local-first operating layer for AI agents: memory, context, generated artifacts, living wiki pages, run history, snapshots, connectors, and safety controls.

Fast mental model:

```text
Imbas OS = umbrella product
Memsocket = memory/context engine
Artifact Vault = artifact/wiki workbench seed
Sanctum = trust, redaction, approvals, agent secret vault
Conduit = agent connector/API layer
```

## Public 1.0 rule

Do not treat Memsocket as optional-to-integrate for public release. For private preview it may remain a separate repo/adapter target, but before public Imbas OS 1.0 it must be merged/integrated/tested as a first-class Imbas OS module. Runtime enablement can remain user-selectable. Public release still requires explicit Johnathan approval.

Do not remove MemPalace during early OpenClaw/Imbas dogfood. MemPalace remains the working OpenClaw/Hermes recall safety net until the staged migration criteria in `docs/architecture/memory-migration.md` pass and Johnathan explicitly approves retirement.

Public 1.0 also requires a fresh-system user experience gate: clean OpenClaw config, Imbas OS with all supported modules, companion app pairing, adapter dogfood, backup/restore, security smoke, and human review loop. See `docs/release/fresh-system-1.0-gate.md`.

## Current repo state

This private-preview repo is seeded from the working Artifact Vault desktop app.

Implemented now:

- Electron + React + TypeScript desktop workbench.
- HTML artifact import/storage/sandboxed replay.
- Artifact bundles, notes, metadata, snapshots, exports.
- Vault-owned Markdown pages.
- Read-only Markdown/wiki bridge.
- Unified search/graph/prompt-package export.
- Sync manifest foundation.
- Security smoke tests for generated HTML.

Implemented as private-preview foundations, but not production complete yet:

- Memsocket adapter/CLI boundary and optional Conduit write/search/context-pack integration; public 1.0 requires full first-class integration.
- Conduit local API/loopback service with durable JSONL private-preview storage.
- OpenClaw shadow connector and constrained local CLI dispatch; Hermes/Codex/Claude Code connector SDKs remain future work.
- Encrypted local Sanctum vault, redaction, policy, and audit foundation; OS keyring/passphrase UX and approval UX remain future work.
- Android companion Kotlin/Compose app with live pairing, QR prefill, Android Keystore-encrypted mobile token storage, scoped reads/actions, diagnostics, Runledger filtering, proposal review, share-sheet capture, and voice-dictation drafts. Remaining mobile work includes physical-device validation, photo capture, richer restore UX, and install/update/signing decisions.

## Setup

```bash
npm install
npm run dev
```

## Verification gates

Before claiming code changes are done, run the smallest meaningful gate. For product changes, prefer:

```bash
npm test
npm run build
```

Before packaging or pushing larger changes, run:

```bash
npm run verify
```

`npm run verify` includes tests, build, Electron smoke, and Electron security smoke.

## Important safety rules

- Do not publish this repo/package publicly without explicit Johnathan approval.
- Do not remove sandboxing or network-block defaults for generated HTML artifacts.
- Do not store raw secrets in artifacts, Markdown pages, Memsocket events, logs, or context packs.
- Use Sanctum-style secret handles/capabilities for future sensitive operations.
- Preserve local-first behavior: no hosted AI/cloud dependency should be required for core flows.
- Keep external Markdown/wiki bridges read-only unless explicit import/ownership is implemented.
- Do not directly couple future connectors to internal SQLite/file details; use stable APIs/protocols.

## Agent documentation convention

Every major Imbas OS module should include both human and agent docs:

- `README.md` or `README.human.md` for humans.
- `AGENTS.md` or `README.agent.md` for agents.

Agent docs should include:

- setup commands;
- verification gates;
- file layout;
- API/contracts;
- safety boundaries;
- canonical context links;
- current implementation status.

Use explicit searchable phrases so retrieval works well:

- Imbas OS
- local-first AI memory
- AI artifact vault
- agent connector
- context pack
- Memsocket
- Artifact Vault
- OpenClaw
- Hermes
- Codex
- Claude Code
- Sanctum agent secret vault

## Current useful docs

- `README.md` — single canonical human+AI-readable project entrypoint.
- `llms.txt` / `llms-full.txt` — AI sitemap and context bundle.
- `skill.md` — actionable workflow guide for agents.
- `docs/index.md` — documentation library map and 1.0 documentation gate.
- `docs/architecture/subsystems.md` — subsystem map.
- `docs/architecture/module-selection.md` — optional module/install-profile direction.
- `docs/architecture/memory-migration.md` — MemPalace → Imbas/Memsocket migration and retirement criteria.
- `docs/architecture/ai-first-os.md` — product principle: UI as a window into the AI operating layer.
- `docs/release/fresh-system-1.0-gate.md` — mandatory clean-system public 1.0 gate.
- `docs/setup/local-development.md` — local setup/run/verification/troubleshooting.
- `docs/setup/android-companion.md` — Android build/install/pair/diagnostics.
- `docs/how-to/use-imbas-os.md` — human desktop/mobile workflows.
- `docs/how-to/lorekeeper-review.md` — proposal/diff/apply/snapshot/restore workflow.
- `docs/mobile/android-companion.md` — Android companion MVP, pairing, scopes, and screen contract.
- `docs/connectors/protocol.md` — connector/API design target.
- `docs/sanctum/agent-secret-vault.md` — secret/capability boundary.
- `docs/file-format.md` — current artifact/wiki storage format.
- `docs/threat-model.md` — current artifact security model.
- `docs/implementation-status.md` — current issue evidence matrix and blockers.
- `docs/ops/verification.md` — verification gates.
- `docs/ops/backup-restore-delete-forget.md` — resilience/privacy lifecycle plan.
- `docs/release/documentation-1.0-gate.md` — docs readiness gate before public 1.0.

## Current environment variable note

Some implementation env vars still use the historical `ARTIFACT_VAULT_*` prefix. Do not rename them mechanically without updating tests/smoke scripts and verifying the full gate.
