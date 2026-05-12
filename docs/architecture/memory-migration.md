# Memory migration: MemPalace to Imbas/Memsocket

This document is a private-preview operating decision. It prevents accidental removal of working memory infrastructure before Imbas OS can replace it safely.

## Decision

Do **not** rip out MemPalace during early Imbas/OpenClaw dogfood.

MemPalace remains the working OpenClaw/Hermes shared recall safety net until Imbas OS + Memsocket can provide equivalent or better memory, retrieval, provenance, redaction, context-pack, and human-review workflows.

The target architecture is still Imbas OS with Memsocket as the first-class memory/context module. The migration should be staged and evidence-driven.

## Current roles

### MemPalace today

- Working shared OpenClaw/Hermes recall.
- Local-first curated memory/context seed.
- MCP tools available to OpenClaw.
- Hermes pre-LLM recall hook.
- Existing refresh/prune workflow for curated seed content.

### Imbas/Memsocket target

- First-class Imbas OS memory/context engine.
- Context events linked to artifacts, wiki pages, runs, approvals, and sources.
- Context packs for OpenClaw, Hermes, Codex, Claude Code, and future agents.
- Sanctum-aware redaction and secret-handle boundaries.
- Human-reviewable memory/wiki proposals in the desktop app.

## Migration phases

### Phase 1 — Dogfood bridge

- Keep MemPalace active for OpenClaw/Hermes recall.
- Start writing selected OpenClaw events, runs, artifacts, and decisions into Imbas OS through Conduit.
- Compare retrieval usefulness between MemPalace and Imbas/Memsocket.
- Record what was written where in Runledger.

Exit criteria:

- OpenClaw can append useful Imbas run/artifact/memory events without breaking current MemPalace recall.
- Imbas desktop can show those events/artifacts/runs to a human.

### Phase 2 — Dual write

- New curated memories/events write to Imbas/Memsocket and MemPalace where appropriate.
- MemPalace remains readable fallback.
- Lorekeeper proposals capture durable wiki/memory updates before they become source of truth.

Exit criteria:

- Imbas/Memsocket can store curated memory events with provenance and visibility metadata.
- Retrieval works for common OpenClaw/Hermes tasks.
- Sanctum redaction boundaries are tested for context packs.

### Phase 3 — Read preference switch

- OpenClaw/Hermes prefer Imbas/Memsocket context packs.
- MemPalace is used only as fallback/archive.
- Compare misses and stale retrievals before disabling any MemPalace hook.

Exit criteria:

- Context packs are good enough for real OpenClaw/Hermes work.
- Runledger can show which context pack was used by which agent/run.
- Human can inspect or challenge memory/context provenance in the desktop UI.

### Phase 4 — Retirement

- Export, archive, or migrate remaining MemPalace content.
- Disable MemPalace refresh/hook only after backups and rollback notes exist.
- Preserve a recoverable MemPalace archive for audit/recovery.

Exit criteria:

- the maintainer explicitly approves retirement.
- Imbas/Memsocket has passed fresh-system and dogfood gates.
- Rollback path is documented and tested.

## Hard requirement before removing MemPalace

Imbas/Memsocket must reliably support at least:

1. curated memory/event storage with provenance;
2. semantic and keyword retrieval;
3. context-pack generation for OpenClaw, Hermes, Codex, and future adapters;
4. Sanctum redaction/secret boundary enforcement;
5. human-reviewable memory/wiki proposals in the desktop app;
6. backup/restore/export/delete/forget behavior;
7. fresh-system onboarding without hidden legacy config.

Until those are true, MemPalace is not deprecated; it is the working safety net.
