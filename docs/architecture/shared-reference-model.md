# Shared reference model

Imbas OS needs one small reference model that every surface can use before Atlas and Memsocket are fully integrated. The goal is to avoid rebuilding links, search, graph traversal, and context packs each time a new subsystem lands.

This is not a database schema. It is the minimum contract that lets human-readable files, local APIs, agents, and future indexes agree on identity and relationships.

## Entities

Every durable thing that can appear in search, graph navigation, Runledger, or context packs should project to an entity shape:

```json
{
  "id": "artifact:01H...",
  "kind": "artifact",
  "title": "Market Map",
  "path": "Projects/Acme/market-map.artifact/",
  "sourceOwnership": "vault-owned",
  "provenance": {
    "createdBy": "user|agent|import",
    "sourceRef": "run:run_...",
    "createdAt": "2026-05-12T00:00:00.000Z"
  }
}
```

Required fields:

- `id` — stable machine reference, prefixed by namespace.
- `kind` — entity type.
- `title` — human display name.
- `path` — human-readable vault-relative path when there is a file/folder representation.
- `sourceOwnership` — whether Imbas owns, imports, bridges, or only indexes the source.
- `provenance` — enough source/ref information for trust, audit, and context-pack citation.

Recommended namespaces:

- `artifact:<id>` — generated/imported artifact bundle.
- `note:<id>` — vault-owned Markdown note with frontmatter ID.
- `wiki:<relative/path.md>` — external read-only bridged wiki page until imported.
- `folder:<path>` — human folder/project grouping.
- `run:<id>` — Runledger entry.
- `proposal:<id>` — Lorekeeper proposal.
- `memory:<id>` — Memsocket event/projection/context item.
- `context-pack:<id>` — generated retrieval/export bundle.

## References

Human links should stay readable. AI/API references should canonicalize to stable IDs.

Examples:

```markdown
[[Projects/Acme/Research Notes]]
[[artifact:01H...]]
[[run:run_...]]
```

Canonical reference shape:

```json
{
  "raw": "[[Projects/Acme/Research Notes]]",
  "targetId": "note:01J...",
  "targetKind": "note",
  "resolved": true,
  "resolutionSource": "frontmatter|manifest|path|search"
}
```

Rules:

- A readable path/title can move or change; the stable ID should not.
- Unresolved references are first-class graph/search results, not hidden parser failures.
- External read-only wiki pages keep their bridged `wiki:<relative/path.md>` IDs until explicitly imported or converted.
- Agents should prefer stable IDs in API calls and preserve readable labels in generated Markdown.

## Edges

Edges describe why two entities are connected:

```json
{
  "from": "run:run_...",
  "to": "artifact:01H...",
  "type": "run-produced",
  "label": "produced artifact",
  "resolved": true,
  "provenance": "runledger:run_..."
}
```

Initial edge types:

- `wikilink`
- `artifact-link`
- `embed`
- `folder-contains`
- `run-produced`
- `proposal-updated`
- `context-used`
- `source-cites`
- `memory-derived-from`
- `context-pack-includes`

## Search, graph, and context packs

Atlas should eventually own unified graph/search navigation, but M1/M2 work should already emit and consume this shared shape where practical.

Minimum expectations:

- Search results include `id`, `kind`, `title`, `path`, `snippet`, and source ownership.
- Graph views use entity IDs and edges, not UI-only state.
- Context packs cite the source entity ID plus the human-readable path/title.
- Memsocket retrieval can point back to wiki/artifact/run sources without copying them into an opaque memory blob.

## Release staging

For HTML Artifact Vault alpha, this contract only needs to cover artifacts, vault-owned Markdown pages, bridged wiki pages, folders/projects, and prompt/context exports.

For Imbas OS private preview, extend the same contract to Runledger, Lorekeeper proposals, Conduit connector events, and Memsocket context events/projections.

For public 1.0, Atlas, Memsocket, Runledger, Lorekeeper, Artifact Vault, SyncCore, Desktop, Android, and CLI should all expose compatible references so backup/restore, delete/forget, graph traversal, and context-pack generation do not rely on one-off adapters.
