# Human filesystem vault architecture

Artifact Vault should be understandable as a normal local folder tree before someone learns any Imbas OS internals.

This is a product requirement for the public Artifact Vault work: the human-facing source tree should feel closer to Obsidian, a project folder, or a plain filesystem than to an app-private database.

## Principle

> Humans get an obvious folder tree. AI agents get stable IDs, indexes, manifests, and context packs generated from that tree.

The human and AI surfaces still share one durable source of truth, but they do not need the same shape.

## Human-facing layout target

The preferred public-facing vault should look roughly like this:

```text
vault-root/
  Inbox/
    Untitled Artifact.artifact/
      artifact.html
      notes.md
      metadata.json
      snapshots/
  Projects/
    Example Project/
      README.md
      Research/
        Notes.md
        Market Map.artifact/
          artifact.html
          notes.md
          metadata.json
          snapshots/
      Decisions/
        ADR-001.md
  Areas/
    Learning/
      HTML Sandbox Lesson.artifact/
        artifact.html
        notes.md
        metadata.json
        snapshots/
  Archive/
  .imbas/
    index.sqlite
    sync-manifest.json
    node.json
    ids.json
```

Exact folder names can evolve, but the direction is fixed:

- humans can create folders inside folders;
- Markdown notes can live beside artifact bundles;
- artifact bundles have readable folder names, not only opaque IDs;
- an artifact bundle should be visually distinguishable, likely with a `.artifact/` directory suffix;
- app-private machine state lives under a hidden `.imbas/` or `.vault/` directory;
- generated/rebuildable indexes are not required for a human to browse the vault.

## Artifact bundle target

A human-readable artifact bundle remains a directory:

```text
Readable Artifact Name.artifact/
  artifact.html
  notes.md
  metadata.json
  snapshots/
    2026-05-12T15-45-00Z.html
    2026-05-12T15-45-00Z.json
```

Required behavior:

- `artifact.html` is the generated/imported active content.
- `notes.md` is the human sidecar note.
- `metadata.json` contains stable identity, provenance, trust, source prompt/model/provider, tags, and links.
- `snapshots/` keeps reversible history.
- The folder name is for humans and may change.
- The stable artifact ID is inside metadata and AI indexes, not encoded only in the folder path.

## Markdown and folders

Markdown should be first-class in the same tree:

- normal `.md` notes can be created inside any human folder;
- notes can use Obsidian-style wikilinks;
- notes can link to artifacts by stable ID or by resolved local reference;
- folder hierarchy should participate in search, graph, AI context package export, and sync manifests.

Artifact Vault should not force users into one flat `pages/` folder long term. The current `pages/` implementation is a stepping stone, not the desired final human layout.


## Links, backlinks, and graph

The human folder tree should also behave like a wiki. Markdown notes, artifact bundles, folders/projects, Runledger entries, and Lorekeeper-managed wiki blocks should map to each other through links, backlinks, and graph views.

Minimum expectations:

- Obsidian-style wikilinks work in Markdown notes.
- Artifacts can be linked from notes and from other artifact notes.
- Each note/artifact can show backlinks.
- Unresolved links and orphan notes/artifacts are visible.
- Moves/renames should preserve graph identity when stable IDs/frontmatter exist.
- AI context-pack export can include a selected graph neighborhood.

See [`wiki-graph-and-agent-capture.md`](wiki-graph-and-agent-capture.md).

## AI-facing layout

AI agents should not rely on fragile human folder names as primary identity.

The AI-facing layer can use:

- stable IDs in `metadata.json` and Markdown frontmatter;
- `.imbas/ids.json` or equivalent path-to-ID maps;
- rebuildable SQLite/vector/graph indexes;
- sync manifests;
- structured JSON records;
- context packs and AI context package exports;
- Conduit APIs.

AI agents may read the human tree when useful, but operational actions should resolve through stable IDs and manifests so moves/renames do not break history.

## Move and rename behavior

A good public Artifact Vault should tolerate normal human filesystem behavior:

- moving an artifact bundle between folders;
- renaming a project folder;
- renaming a `.artifact/` directory;
- adding Markdown notes manually;
- creating subfolders outside the app.

Expected handling:

1. Rebuild indexes from the filesystem.
2. Preserve stable IDs from metadata/frontmatter.
3. Detect moved/renamed paths as path changes, not new objects, when IDs match.
4. Warn on duplicate IDs.
5. Treat missing metadata as an import/adoption flow, not silent corruption.

## Public alpha implication

Before public release, the product should either:

1. implement this human-readable tree directly; or
2. clearly label the current ID-based `artifacts/<id>/` and flat `pages/` layout as a temporary private-preview structure, with the public roadmap pointing to the human filesystem layout as a release blocker.

Preferred path: implement the human-readable tree before public unveil, because it is central to the product feel.

## Non-goals

- Do not replace Obsidian outright.
- Do not require users to understand app-private indexes.
- Do not make the AI surface scrape visual UI state.
- Do not make stable identity depend only on human folder names.
- Do not silently rewrite external Obsidian/OpenClaw vaults.
