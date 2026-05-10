# Imbas OS

Local-first operating layer for AI memory, context, artifacts, living wiki pages, and agent handoffs.

Imbas OS is the combined product direction for what started as **Artifact Vault** plus **Memsocket**:

- **Memsocket** stores memory/context events, projections, search, and context packs.
- **Artifact Vault** stores generated artifacts, Markdown/wiki knowledge, snapshots, provenance, and safe replay.
- **Imbas OS** wraps those pieces into one private system for humans and AI agents.

The goal:

> Connect your agents once; Imbas OS captures what they know and make, then feeds the right context back when they work.

## Current private-preview status

This repo is currently seeded from the working Artifact Vault desktop app. It already includes:

- Electron + React + TypeScript desktop shell.
- Local vault initialization.
- AI-generated HTML artifact import/paste/file import.
- Sandboxed artifact replay through `artifact://`.
- Artifact bundles with metadata, notes, snapshots, provenance, trust levels, and export paths.
- Vault-owned Markdown pages.
- Read-only Markdown/wiki bridge.
- Unified artifact + Markdown search.
- Mixed graph/backlinks and prompt-package export.
- Sync manifest foundation.
- Demo vault with seven artifacts.
- Security smoke test for generated HTML boundaries.

Not implemented yet:

- Memsocket adapter inside this repo.
- Local Imbas OS API/daemon.
- OpenClaw/Hermes/Codex/Claude Code connectors.
- Sanctum agent secret vault implementation.
- Android companion app.
- Production installer.

## Quick start for humans

```bash
git clone https://github.com/ObiJuanDeanobi/imbas-os.git
cd imbas-os
npm install
npm run dev
```

For a production-style local run:

```bash
npm run build
npm start
```

## Verify

```bash
npm test
npm run build
npm run smoke
npm run smoke:security
```

Or run the full local preview gate:

```bash
npm run verify
```

Create a private dev preview tarball after the full gate:

```bash
npm run package:dev
```

This writes `release/imbas-os-dev-preview.tgz`. It is private/internal only; do not publish externally without an explicit release decision.

On headless Linux CI/VPS environments, Electron may require `--no-sandbox` unless the Chromium `chrome-sandbox` helper is root-owned and mode `4755`. The app still configures renderer security controls; the flag is only a host-level smoke-test workaround.

## Docs for humans and agents

Imbas OS is designed for both people and AI agents. Every major module should include:

- human-facing README/docs for product setup and concepts;
- agent-facing README/docs for commands, boundaries, contracts, and verification gates.

Start here:

- [`AGENTS.md`](AGENTS.md) — agent quick-start and safety boundaries.
- [`docs/imbas/human-readme.md`](docs/imbas/human-readme.md) — human product overview.
- [`docs/imbas/agent-readme.md`](docs/imbas/agent-readme.md) — agent-facing operating guide.
- [`docs/architecture/subsystems.md`](docs/architecture/subsystems.md) — subsystem map.
- [`docs/architecture/module-selection.md`](docs/architecture/module-selection.md) — optional module/install-profile direction.
- [`docs/architecture/ai-first-os.md`](docs/architecture/ai-first-os.md) — product principle: UI as a window into the AI operating layer.
- [`docs/mobile/android-companion.md`](docs/mobile/android-companion.md) — Android companion MVP, pairing, scopes, and screen contract.
- [`docs/sanctum/agent-secret-vault.md`](docs/sanctum/agent-secret-vault.md) — Sanctum secret/capability design.
- [`docs/connectors/protocol.md`](docs/connectors/protocol.md) — connector/API target.

## Subsystems

```text
Imbas OS
├─ Memsocket        memory + context engine
├─ Artifact Vault   generated artifacts + snapshots
├─ Lorekeeper       living wiki / Markdown knowledge
├─ Conduit          agent connectors / API / MCP / webhooks
├─ Runledger        run history + audit trail
├─ Sanctum          trust, permissions, redaction, approvals, agent secret vault
├─ Atlas            graph + search + navigation
├─ SyncCore         sync, backup, import/export
├─ Desktop          full workbench client
├─ Mobile           Android companion
└─ CLI              terminal + automation interface
```

## Public 1.0 release rule

Before Imbas OS is released publicly as 1.0, **Memsocket must be fully integrated, merged into the Imbas OS release story, and tested as a first-class module**. Users may still choose whether to enable Memsocket at runtime, but public 1.0 should not ship as a loosely related Artifact Vault app plus an external memory repo.

Required before public 1.0:

- Memsocket included in supported install/profile story.
- End-to-end events/search/context-pack flow.
- OpenClaw/Hermes connector dogfood.
- Sanctum redaction/secret-handle safety across memory/context packs.
- Backup/restore/export/delete/forget behavior tested across memory, artifacts, and wiki.
- Explicit Johnathan approval.

## Private release boundary

This repository is private preview only. No public release, package publishing, hosted service, or public announcement should happen without explicit Johnathan approval.
