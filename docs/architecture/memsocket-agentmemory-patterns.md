# Memsocket patterns inspired by agentmemory

Source reviewed: `rohitg00/agentmemory` at commit `13924d2` (`v0.9.6`, Apache-2.0), inspected 2026-05-11. This is a pattern-harvest note, not an integration decision. We should not vendor or install agentmemory into Imbas OS without a separate security/design review.

## Positioning

agentmemory overlaps with Memsocket's intended role: persistent agent memory, hybrid retrieval, context injection, session capture, and replay. For Imbas OS, the useful move is not to adopt agentmemory wholesale, but to sharpen Memsocket's first-class module design using the best patterns.

Memsocket should remain the Imbas memory engine boundary:

- **Conduit** accepts events/runs/artifacts/proposals from agents and apps.
- **Sanctum** redacts secrets and resolves capability handles.
- **Memsocket** stores event-sourced memory and builds searchable projections/context packs.
- **Lorekeeper** proposes durable wiki edits, never silently mutates human-readable knowledge.
- **Runledger** records what happened, what changed, and why.

## Patterns worth adopting

### 1. One memory surface, many clients

agentmemory presents REST + MCP surfaces so different agents can use the same memory backend.

For Imbas:

- Keep Conduit REST as the canonical local API.
- Add an MCP facade later for Codex/Hermes/OpenClaw/Claude-style clients.
- Do not let each connector invent its own memory persistence path.
- Treat Android as another scoped client of Conduit, not a special database peer.

Candidate endpoints/tools:

- `POST /v0/events` — append context event.
- `POST /v0/runs` — append run summary.
- `POST /v0/search` — search memories/events/runs/wiki proposals.
- `POST /v0/context-packs` — retrieve task-shaped context.
- future MCP: `imbas_memory_search`, `imbas_context_pack`, `imbas_event_record`, `imbas_run_record`, `imbas_proposal_create`.

### 2. Tiered memory lifecycle

agentmemory describes working/episodic/semantic/procedural memory plus lifecycle/decay. Imbas already has compatible layers in `ImbasMemoryLayer`:

- `episodic` — session/run events and observations.
- `semantic` — durable facts/concepts extracted from repeated evidence.
- `profile` — user/project preferences and stable identity facts.
- `procedural` — workflows, runbooks, implementation lessons.
- `causal` — decisions, tradeoffs, why something happened.
- `live_state` — recent status, service health, currently-active work.

Design implication: Memsocket should store raw/redacted events separately from derived projections. Retrieval should be able to ask for a budgeted mix by layer rather than returning a flat bag of snippets.

### 3. Hybrid retrieval, but budgeted and explainable

agentmemory uses a hybrid retrieval story: lexical/BM25 + vector + graph, fused and budgeted.

For Imbas:

- Start with deterministic lexical/local search as fallback.
- Add vector search as an optional projection, not a hard dependency.
- Add graph traversal only where entities/refs are explicit enough to explain.
- Context packs should include provenance and why each item was selected.
- Every context pack should respect `maxTokens`, `allowedVisibility`, `projectId`, connector, and agent scopes.

A good context-pack shape:

```ts
interface ImbasContextPack {
  task: string;
  createdAt: string;
  budget: { requestedTokens: number; estimatedTokens: number };
  filters: { projectId?: string; allowedVisibility: ImbasVisibility[] };
  items: Array<{
    id: string;
    layer: ImbasMemoryLayer;
    visibility: ImbasVisibility;
    title: string;
    summary: string;
    sourceRefs: string[];
    score: number;
    reason: string;
  }>;
  warnings: string[];
}
```

### 4. Replay as a first-class debugging primitive

agentmemory's replay viewer idea is directly useful. Imbas already has Runledger and Conduit JSONL, so we can implement replay without adopting their runtime.

For Imbas:

- Store replayable event/run timelines as append-only records.
- Link events, tool calls, artifacts, Lorekeeper proposals, Sanctum redactions, and Memsocket writes by `runId`/refs.
- Add `GET /v0/replay/runs/:runId` later.
- Surface replay in desktop first, Android read-only later.

This helps debug: “why did the agent remember this?”, “what did the Android app approve?”, and “what source produced this wiki proposal?”.

### 5. Governance and deletion audit

agentmemory has explicit deletion/audit posture. Imbas needs this even more because Sanctum, Lorekeeper, and user-visible memory overlap.

For Imbas:

- Deleting/forgetting should write Runledger audit entries before/after action.
- Destructive memory operations should be proposal-first unless scoped and reversible.
- `secret_pointer` memory should never be expanded into ordinary context packs.
- Forget operations must distinguish:
  - raw Conduit event;
  - Memsocket projection/index entry;
  - Lorekeeper wiki block;
  - artifact file;
  - Runledger audit marker.

Future endpoint sketch:

- `POST /v0/memory/forget-proposals`
- `POST /v0/memory/forget-proposals/:id/approve`
- `POST /v0/memory/forget-proposals/:id/apply`

### 6. Health, fallback, and circuit breaker behavior

agentmemory had recent fixes around slow hooks and server fallback. That reinforces a key Imbas rule: memory must not make the agent unusable.

For Imbas:

- Conduit local storage remains the fallback when Memsocket is unavailable.
- Memsocket write-through failures mark module health but do not reject safe event ingestion.
- Context-pack calls should return partial/fallback results with warnings instead of hard failing where possible.
- Timeouts should be short on chat-path retrieval and longer only in background consolidation.

### 7. Benchmark harness, not benchmark theater

agentmemory publishes LongMemEval-style claims. We should treat that as inspiration for our own small evals, not as inherited proof.

For Imbas:

- Create tiny project-memory eval fixtures:
  - architecture decision recall;
  - bug/regression recall;
  - user preference recall;
  - source provenance recall;
  - secret redaction refusal.
- Gate Memsocket changes on recall correctness and privacy constraints.
- Prefer reproducible local fixtures before public benchmark claims.

## What not to copy yet

- Do not depend on `iii-engine` for Imbas OS memory.
- Do not install agentmemory as the OpenClaw memory slot while MemPalace/OpenClaw memory-core are active.
- Do not adopt broad auto-capture without strong privacy filters and user-visible audit.
- Do not trust remote benchmark claims without reproducing them.
- Do not let memory auto-write durable wiki pages; keep Lorekeeper proposal-first.

## Concrete next slices

### Slice A — Context pack contract hardening

Add a typed `ImbasContextPack` response model and make `/v0/context-packs` return provenance-rich items even for `conduit-local` fallback.

Verification:

- unit test local context-pack response shape;
- assert token budget metadata exists;
- assert source refs are preserved.

### Slice B — Replay timeline endpoint

Add `GET /v0/replay/runs/:runId` aggregating events, run summary, runledger entries, proposals, and Sanctum audit entries by refs/runId.

Verification:

- unit test replay timeline for a run with event + run + proposal + redaction.

### Slice C — Memory governance proposal skeleton

Add in-memory/durable proposal type for forget/delete operations, but do not execute destructive deletes yet.

Verification:

- test proposal creation;
- test approval state transition;
- test Runledger audit entry creation.

### Slice D — Memsocket retrieval quality eval fixture

Add a small deterministic eval harness around `/v0/search` and `/v0/context-packs`, initially running against `conduit-local`, then Memsocket when integrated.

Verification:

- queries for known architecture decisions return cited records;
- secret-like content is redacted and not returned raw;
- fallback behavior is explicit when Memsocket is disabled.

## Recommendation

Fold these ideas into the public-1.0 Memsocket gate as design requirements, but implement them incrementally inside Imbas OS. The priority order should be:

1. context-pack contract;
2. replay endpoint;
3. Android read-only visibility over both;
4. forget/governance proposal skeleton;
5. retrieval eval harness;
6. only then deeper Memsocket merge/integration.
