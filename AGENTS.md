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

Not implemented yet:

- Memsocket adapter.
- Imbas OS local service/API.
- Conduit connectors for OpenClaw/Hermes/Codex/Claude Code.
- Sanctum agent secret vault implementation.
- Android companion app.

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

- `README.md` — human quick-start.
- `docs/imbas/human-readme.md` — product overview.
- `docs/imbas/agent-readme.md` — agent operating guide.
- `docs/architecture/subsystems.md` — subsystem map.
- `docs/connectors/protocol.md` — connector/API design target.
- `docs/sanctum/agent-secret-vault.md` — secret/capability boundary.
- `docs/file-format.md` — current artifact/wiki storage format.
- `docs/threat-model.md` — current artifact security model.

## Current environment variable note

Some implementation env vars still use the historical `ARTIFACT_VAULT_*` prefix. Do not rename them mechanically without updating tests/smoke scripts and verifying the full gate.
