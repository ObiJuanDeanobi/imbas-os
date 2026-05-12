# Wiki and Memsocket boundary

Lorekeeper/wiki and Memsocket should be tightly connected, but they are not the same subsystem.

Johnathan's product direction:

> The wiki is the long-term human-readable knowledge base for AI and humans. Memsocket is the contextual memory, agentic search, retrieval, and context-pack engine.

## Roles

### Lorekeeper / wiki

The wiki is for durable knowledge that should be readable, reviewable, and maintainable by humans:

- project pages;
- entity pages;
- architecture notes;
- ADRs and decisions;
- runbooks and procedures;
- curated lessons learned;
- stable user/project preferences when appropriate;
- sourced summaries that should survive beyond one run.

The wiki should live primarily as Markdown in the human filesystem vault. It should support links, backlinks, graph navigation, managed blocks, snapshots, and proposal-first updates.

### Memsocket

Memsocket is for contextual and operational memory that agents use while working:

- session/run context events;
- episodic observations;
- semantic/procedural/profile/causal/live-state projections;
- agentic search across recent and durable context;
- retrieval ranking;
- context packs;
- graph traversal and budgeted context selection;
- provenance-aware memory queries;
- fallback/replay/debug data for why something was retrieved.

Memsocket can index wiki content and produce context from it, but it should not be the only place where curated long-term wiki knowledge lives.

## Relationship

The intended relationship is bidirectional with clear authority:

```text
Human wiki / Lorekeeper Markdown
  ├─ source of truth for curated durable knowledge
  ├─ human-readable pages, managed blocks, links, backlinks
  └─ emits/indexes into Memsocket for retrieval/context packs

Memsocket
  ├─ source of truth for contextual memory events and projections
  ├─ searches/ranks/retrieves wiki + events + runs + artifacts
  └─ can propose wiki updates through Lorekeeper, not silently rewrite pages
```

## Source-of-truth rules

- Curated long-term knowledge belongs in the wiki/Lorekeeper Markdown layer.
- Raw and derived contextual memory belongs in Memsocket.
- Run history belongs in Runledger.
- Generated artifacts belong in Artifact Vault.
- Sensitive policy/secret handling belongs in Sanctum.
- Cross-object navigation/search belongs in Atlas, backed by explicit refs from all systems.

## Wiki → Memsocket flow

Wiki content should feed Memsocket as indexed context:

1. A Markdown page or managed block changes.
2. Lorekeeper records provenance and snapshot/restore information.
3. The change emits a context event or index update for Memsocket.
4. Memsocket stores/searches a compact projection with source refs back to the wiki page/block.
5. Context-pack retrieval can include the wiki item with citation and freshness metadata.

Memsocket projections from wiki should preserve:

- page/block stable ID;
- path and title;
- source ownership;
- links/backlinks;
- last reviewed/updated timestamps;
- source citations;
- trust/confidence where applicable.

## Memsocket → wiki flow

Memsocket can identify knowledge worth curating, but should not silently mutate the wiki.

Expected flow:

1. Agent work creates context events, runs, artifacts, and observations.
2. Memsocket retrieval/projection identifies durable facts, lessons, or procedures.
3. Lorekeeper creates a proposal for a wiki page or managed block.
4. Human or policy-approved lane reviews/applies it.
5. Runledger records the proposal and apply result.
6. The updated wiki re-indexes into Memsocket.

This keeps long-term knowledge readable and governed while still letting agents learn from their work.

## Search and context packs

Agentic search should span both systems:

- wiki pages and managed blocks;
- Memsocket contextual events/projections;
- Artifact Vault artifacts and sidecar notes;
- Runledger entries;
- Lorekeeper proposals;
- graph neighborhoods and backlinks.

A context pack should explain why each item was selected and cite whether it came from:

- `wiki:<path-or-block-id>`;
- `memsocket:<event-or-projection-id>`;
- `artifact:<artifact-id>`;
- `runledger:<entry-id>`;
- `lorekeeper:<proposal-id>`.

## Delete/forget implications

Forget/delete needs to respect both layers:

- Removing a Memsocket projection does not necessarily delete the wiki source page.
- Editing/removing a wiki page should invalidate or update Memsocket projections.
- Destructive wiki changes should be proposal-first unless clearly reversible and policy-approved.
- Sensitive content must be redacted before it becomes wiki knowledge or ordinary Memsocket context.
- Runledger should record material forget/delete actions.

## Public release implications

For Artifact Vault alpha:

- The wiki should feel physically present as Markdown notes in the human folder tree.
- Links/backlinks/graph should make wiki notes and artifacts feel connected.
- The storage model should keep stable IDs/provenance ready for Memsocket indexing.

For Imbas OS public 1.0:

- Memsocket must be first-class and integrated with Lorekeeper/wiki.
- Context packs must retrieve from both wiki and Memsocket with source citations.
- Lorekeeper proposals must be able to arise from Memsocket-derived evidence.
- Wiki changes must re-index into Memsocket.
- Search/graph should cross wiki, memory, artifacts, runs, and proposals.

## Anti-patterns

Avoid:

- wiki as a disconnected document viewer;
- Memsocket as an opaque replacement for human-readable wiki knowledge;
- agents writing durable wiki pages silently from transient memory;
- context packs that cite uncited blobs with no path back to source;
- duplicate facts drifting between wiki and memory with no provenance or freshness metadata.
