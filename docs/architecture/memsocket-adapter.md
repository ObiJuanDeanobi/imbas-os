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

Not implemented yet:

- writing into a live Memsocket `ContextEventStore` from Node/Electron;
- spawning the Memsocket CLI;
- context pack retrieval from Memsocket;
- richer error taxonomy and retry behavior.

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
