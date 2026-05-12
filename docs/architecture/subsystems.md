# Imbas OS Subsystems

Imbas OS is the umbrella product: a local-first operating layer for AI agents.

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

## Memsocket

Contextual memory and agentic retrieval engine:

- append-only context events;
- memory projections;
- search and retrieval;
- task-specific context packs;
- provenance and visibility filters;
- indexing/search over curated wiki knowledge without replacing the wiki source of truth.

## Artifact Vault

Generated artifact workbench:

- HTML artifacts and mini-tools;
- artifact bundles;
- sandboxed replay;
- snapshots;
- prompt-package export;
- provenance and trust levels.

## Lorekeeper

Long-term human-readable knowledge/wiki system:

- Markdown/wiki pages;
- managed blocks;
- project context;
- ADRs/runbooks/entity pages;
- wiki update proposals;
- read-only bridge over external vaults;
- curated knowledge that indexes into Memsocket for retrieval/context packs.

## Conduit

Agent connector layer:

- OpenClaw;
- Hermes;
- Codex;
- Claude Code;
- generic CLI/API/webhook/MCP interfaces;
- connector auth/capability declarations.

## Runledger

Run history and audit trail:

- agent run summaries;
- task/session timelines;
- verification results;
- follow-ups/blockers;
- produced artifacts;
- links to memory/wiki/source files/commits/issues.

## Sanctum

Trust, permissions, redaction, approvals, and the agent secret vault.

Sanctum lets agents request sensitive capabilities without seeing raw secrets. It owns:

- visibility/sensitivity policy;
- redaction;
- approval gates;
- artifact sandbox trust policy;
- connector scopes;
- local auth/pairing;
- secret handles/capabilities;
- audit records for sensitive access.

## Atlas

Graph/search/navigation:

- search across memory, wiki, artifacts, runs, sources, and projects;
- explicit links/backlinks;
- timelines;
- provenance navigation;
- context exploration.

## SyncCore

Sync, backup, import/export:

- node identity;
- deterministic manifests;
- backup/restore;
- portable bundles;
- conflict detection;
- delete/forget propagation;
- cache/index rebuilds.

## Desktop

Full human workbench for setup, search, artifact viewing, approvals, debugging, and connector management.

## Mobile

Android companion for secure pairing, search, capture, approvals, notifications, and lightweight artifact/run viewing.

## CLI

Terminal/admin and automation interface for humans, scripts, and agents.

## Module selection

See [`module-selection.md`](module-selection.md). Imbas OS should be modular: users should be able to enable Artifact Vault, Memsocket, Sanctum, Conduit, Lorekeeper, Runledger, Atlas, SyncCore, Desktop, Mobile, and CLI according to their needs rather than being forced into a monolith.

## AI-first OS principle

See [`ai-first-os.md`](ai-first-os.md). Imbas OS should be treated as an AI-first operating layer: the durable agent world is the source of truth, and the UI is how humans see into, correct, approve, and steer that world.

## Wiki and Memsocket boundary

See [`wiki-memsocket-boundary.md`](wiki-memsocket-boundary.md). The wiki/Lorekeeper layer is the long-term human-readable knowledge base; Memsocket is the contextual memory, agentic search, and context-pack engine. They should be tightly linked without collapsing into one opaque system.

## Dual-surface information architecture

See [`dual-surface-information.md`](dual-surface-information.md). Imbas OS should expose human-readable and AI-operable surfaces over the same durable local state.
