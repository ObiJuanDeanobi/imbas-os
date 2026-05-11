# Memsocket Adapter

The Memsocket adapter maps Imbas OS context events into Memsocket vNext `ContextEvent` payloads without coupling Imbas OS connectors directly to Memsocket storage internals.

## Boundary

- Imbas OS owns connector protocol, artifacts, runs, wiki proposals, and Sanctum policy.
- Memsocket owns event-sourced memory, projections, search, and context packs.
- The adapter translates between Imbas `ImbasContextEventDraft` and Memsocket-compatible event payloads.

## Current private-preview slice

Implemented now:

- deterministic mapping from Imbas event drafts to Memsocket event payload shape;
- namespace/session/layer/visibility/source/provenance mapping;
- Sanctum redaction before payload creation;
- validation that `secret_pointer` events use Sanctum handles/capabilities.

Implemented as a private-preview CLI boundary, but not final public-1.0 integration:

- writing into Memsocket through `python3 -m memsocket.cli` when configured;
- spawning the Memsocket CLI through `src/main/memsocket/cliClient.ts`;
- search and context-pack retrieval through the CLI boundary;
- live module health updates when the CLI write path fails.

Still remaining:

- direct first-class Imbas OS module integration/packaging for public 1.0;
- richer error taxonomy and retry behavior;
- broader backup/restore/delete/forget tests across Memsocket + artifact/wiki state.

## Mapping

| Imbas field | Memsocket field |
| --- | --- |
| `projectId` or adapter namespace | `namespace` |
| `runId` | `session_id` |
| `type` | `event_type` |
| `agent` | `actor_id` |
| `layer` | `layers[0]` |
| `visibility` | `visibility` |
| `text` | `text` after Sanctum redaction |
| `source.uri` | `source_uri` |
| connector/project/run/source/links | `metadata` / `tags` |

## Next slices

1. Decide whether private preview writes use Memsocket CLI, Python sidecar process, or a Node-readable JSONL handoff.
2. Add write/read integration against a fixture Memsocket state directory.
3. Add `context_pack` retrieval through Memsocket `brief` once the storage boundary is selected.
4. Keep OpenClaw/MemPalace fallback until private dogfood validates quality and safety.

## Module packaging note

See [`module-selection.md`](module-selection.md). Memsocket is currently a separate engine repo with an Imbas adapter, not vendored into this repo. The intended private-preview direction is optional integration through stable boundaries.

See also [`memsocket-agentmemory-patterns.md`](memsocket-agentmemory-patterns.md) for pattern-harvest notes from agentmemory that should inform Memsocket's Imbas OS integration without adopting agentmemory as a runtime dependency.


## CLI boundary

Private preview now includes a Memsocket CLI client boundary in `src/main/memsocket/cliClient.ts`. It shells out to `python3 -m memsocket.cli` by default and passes mapped/redacted Imbas events through JSON stdin. It also exposes search and context-pack (`brief`) calls.

This is not the final public 1.0 merge shape; it is the first live boundary for dogfooding. Public 1.0 still requires Memsocket to be merged/integrated/tested as a first-class Imbas OS module.
