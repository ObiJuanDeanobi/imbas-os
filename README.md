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

Implemented as private-preview foundations, but not production complete yet:

- Memsocket adapter/CLI boundary and optional Conduit write-through; public 1.0 still requires full first-class integration.
- Local Conduit API/loopback service for status, events, runs, artifacts, search, context packs, Lorekeeper proposals/apply, and mobile pairing.
- OpenClaw shadow connector; Hermes/Codex/Claude Code SDKs remain future work.
- Sanctum encrypted local vault, handle/capability validation, redaction, policy-checked resolution, and audit foundations.
- Android Kotlin/Compose companion with live pairing, QR prefill, Keystore-encrypted token storage, scoped reads/actions, diagnostics, Runledger filtering, share-sheet capture, and voice-dictation drafts.
- Private-preview tarball/package restore gate; production installer remains future work.

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

Create and verify a private dev preview tarball after the full gate:

```bash
npm run package:dev
```

Check Android companion scaffold files without requiring local Android build tooling:

```bash
npm run android:check
```

This writes `release/imbas-os-dev-preview.tgz` and runs `npm run verify:preview` to check package contents/restorability. It is private/internal only; do not publish externally without an explicit release decision.

On headless Linux CI/VPS environments, Electron may require `--no-sandbox` unless the Chromium `chrome-sandbox` helper is root-owned and mode `4755`. The app still configures renderer security controls; the flag is only a host-level smoke-test workaround.

## Docs for humans and agents

Imbas OS is designed for both people and AI agents. Every major module should include:

- human-facing README/docs for product setup and concepts;
- agent-facing README/docs for commands, boundaries, contracts, and verification gates.

Start here:

- [`docs/README.md`](docs/README.md) — documentation library map and 1.0 documentation standard.
- [`AGENTS.md`](AGENTS.md) — agent quick-start and safety boundaries.
- [`docs/imbas/human-readme.md`](docs/imbas/human-readme.md) — human product overview.
- [`docs/imbas/agent-readme.md`](docs/imbas/agent-readme.md) — agent-facing operating guide.
- [`docs/architecture/subsystems.md`](docs/architecture/subsystems.md) — subsystem map.
- [`docs/architecture/module-selection.md`](docs/architecture/module-selection.md) — optional module/install-profile direction.
- [`docs/architecture/memory-migration.md`](docs/architecture/memory-migration.md) — staged MemPalace → Imbas/Memsocket dogfood and retirement plan.
- [`docs/architecture/ai-first-os.md`](docs/architecture/ai-first-os.md) — product principle: UI as a window into the AI operating layer.
- [`docs/mobile/android-companion.md`](docs/mobile/android-companion.md) — Android companion MVP, pairing, scopes, and screen contract.
- [`docs/sanctum/agent-secret-vault.md`](docs/sanctum/agent-secret-vault.md) — Sanctum secret/capability design.
- [`docs/connectors/protocol.md`](docs/connectors/protocol.md) — connector/API target.
- [`docs/setup/local-development.md`](docs/setup/local-development.md) — local setup, run, verification, and troubleshooting.
- [`docs/setup/android-companion.md`](docs/setup/android-companion.md) — APK build/install/pair/diagnostics flow.
- [`docs/how-to/use-imbas-os.md`](docs/how-to/use-imbas-os.md) — day-to-day desktop and companion workflows.
- [`docs/ops/verification.md`](docs/ops/verification.md) — verification gates and live checks.
- [`docs/release/documentation-1.0-gate.md`](docs/release/documentation-1.0-gate.md) — required docs bar before public 1.0.

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
- MemPalace retired only after the staged migration criteria pass; until then it remains a working safety net, not the public 1.0 memory dependency.
- Documentation readiness gate and fresh-system user experience gate pass: clean OpenClaw config connected to Imbas OS with all supported modules, companion app paired, adapters tested, backup/restore tested, and security smoke verified. See [`docs/release/fresh-system-1.0-gate.md`](docs/release/fresh-system-1.0-gate.md).
- Backup/restore/export/delete/forget behavior tested across memory, artifacts, and wiki.
- Explicit Johnathan approval.

## Private release boundary

This repository is private preview only. No public release, package publishing, hosted service, or public announcement should happen without explicit Johnathan approval.
