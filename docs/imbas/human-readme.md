# Imbas OS — Human README

Imbas OS is a local-first operating layer for AI agents.

It gives your AI systems one private place to store, search, and reuse:

- memories and context;
- project knowledge and living wiki pages;
- generated HTML artifacts and mini-tools;
- run summaries and handoffs;
- snapshots, exports, and provenance.

The goal:

> Install Imbas OS once, connect your agents, and let them remember/use their work without you manually filing everything.

## Current private preview

This repo currently runs as a desktop artifact/wiki workbench seeded from Artifact Vault.

Memsocket, Conduit connectors, Sanctum secret vault, and Android companion are documented as the next systems to integrate.

## Main pieces

- **Memsocket** — memory and context engine.
- **Artifact Vault** — generated artifacts and wiki workbench.
- **Lorekeeper** — living wiki and durable Markdown knowledge.
- **Conduit** — agent connector layer.
- **Runledger** — agent run history and audit trail.
- **Sanctum** — trust, approvals, redaction, and agent secret vault.
- **Atlas** — graph/search/navigation.
- **SyncCore** — sync, backup, import/export.
- **Desktop** — full workbench.
- **Mobile** — Android companion.
- **CLI** — terminal/admin automation.

## Quick start

```bash
npm install
npm run dev
```

## Verify

```bash
npm run verify
```

## Boundary

This is private-preview software. Do not publish, package publicly, or announce externally without explicit approval.
