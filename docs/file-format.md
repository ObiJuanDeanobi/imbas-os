# File format

Artifact Vault uses local folder-per-artifact bundles for generated HTML artifacts and read-only bridge records for external Markdown/wiki pages. The filesystem is the source of truth; indexes are rebuildable caches.

Public-product direction: the human-facing vault should become an Obsidian-like folder tree with folders inside folders, Markdown notes beside artifact bundles, and readable `.artifact/` directories. Stable AI identity should live in metadata/frontmatter and hidden indexes, not in opaque folder names. See [`architecture/human-filesystem-vault.md`](architecture/human-filesystem-vault.md).

## Vault root

```text
vault-root/
  .vault/
    manifest.json
  artifacts/
    <artifact-id>/
      artifact.html
      metadata.json
      notes.md
      snapshots/
        <timestamp>.html
        <timestamp>.json
```

In the current Electron skeleton, the default vault root is:

```text
<electron userData>/html-artifact-vault
```

## Artifact bundle

### `artifact.html`

The imported or generated HTML payload. It is treated as untrusted active content by default.

### `metadata.json`

Current core fields:

```json
{
  "id": "uuid",
  "title": "Artifact title",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "sourceType": "paste",
  "prompt": "",
  "model": "",
  "provider": "",
  "sourcePath": "/optional/local/source.html",
  "project": "Optional project or collection",
  "trustLevel": "untrusted",
  "tags": [],
  "hashes": { "sha256Html": "..." },
  "links": [],
  "snapshotCount": 1
}
```

`trustLevel` starts as `untrusted` for every imported artifact.

The app can edit durable metadata after import: title, project, tags, trust level, provider, model, source path, and source prompt. Edits update `updatedAt` and recompute explicit artifact links from HTML, sidecar notes, and prompt text.

File imports set `sourceType: "file"` and record the local `sourcePath` when available. The artifact bundle remains self-contained because the imported HTML is copied into `artifact.html`; `sourcePath` is provenance only.

### `notes.md`

Human-readable sidecar note. Markdown remains the durable note/export substrate.

### `snapshots/`

Initial import writes the first HTML and metadata snapshot. Snapshot restore copies a previous HTML payload back to `artifact.html`, restores snapshot metadata fields, recomputes hashes/links, and records the restore as a new snapshot so the action remains reversible.

## Indexing

The rebuildable SQLite FTS cache lives at:

```text
vault-root/.vault/index.sqlite
```

The index stores searchable copies of title, tags, notes, source prompt, and visible HTML text. Artifact bundles remain the source of truth; deleting `index.sqlite` and rebuilding from `artifacts/*` must recover search behavior.

## Sync foundation

Artifact Vault now has a transport-neutral sync foundation. This is not a full sync service yet; it is the source-file manifest and status layer needed for safe sync later.

Local node identity lives at:

```text
vault-root/.vault/node.json
```

It contains a stable device/node ID and display name. This file is local device identity and is not treated as shared source content by the manifest builder.

The rebuildable sync manifest lives at:

```text
vault-root/.vault/sync-manifest.json
```

Each manifest entry records:

- vault-relative path;
- SHA-256 hash;
- byte size;
- logical type, such as `artifact-html`, `artifact-metadata`, `artifact-notes`, `artifact-snapshot-html`, `artifact-snapshot-metadata`, `markdown-page`, or `vault-manifest`;
- file modified timestamp;
- last writer node;
- trust level for artifact metadata entries.

Rebuildable caches such as `.vault/index.sqlite`, `.vault/node.json`, and `.vault/sync-manifest.json` are excluded from sync source entries. Artifact bundles and Markdown pages remain the syncable source material.

Sync status compares the current filesystem against the saved manifest and reports changed files plus conflict candidates. If an artifact metadata conflict changes `trustLevel`, it is flagged as `trust-level-change-requires-review` so trust never silently promotes across nodes.

## Vault-owned Markdown pages

Current private-preview implementation: Artifact Vault-owned Markdown pages live under:

```text
vault-root/pages/<slug>.md
```

These pages are different from external Obsidian/OpenClaw wiki pages:

- `sourceOwnership: vault-owned` pages can be created and edited by Artifact Vault.
- `sourceOwnership: external-readonly` pages are indexed through the bridge and are not rewritten.

Vault-owned pages support frontmatter, normal Markdown text, Obsidian-style wikilinks, and artifact links such as:

```markdown
[[Project Note]]
[[artifact:00000000-0000-0000-0000-000000000000]]
```

They participate in unified search, graph edges, backlinks, sync manifests, and mixed Markdown + HTML prompt-package export.

Longer term, `pages/` should evolve into a general human folder tree where Markdown notes can live anywhere under project/area folders, closer to an Obsidian vault. The AI surface should continue resolving pages through stable IDs/frontmatter and manifests so user moves/renames remain safe.

## Prompt package export

Prompt-package export is a generated Markdown handoff for the next AI/human pass. It includes artifact metadata, explicit links, original/source prompt, sidecar notes, fenced HTML, and a safety reminder to preserve local-first assumptions and avoid adding network dependencies unless explicitly requested.

Mixed prompt-package export combines selected Markdown pages and HTML artifacts into one generated Markdown handoff. For bridged Markdown pages it includes page ID, relative path, `sourceOwnership`, tags, artifact links, and fenced Markdown content. For artifacts it includes metadata, sidecar notes, source prompt, and fenced HTML.

## Portable bundle-folder export/import

The app can export an artifact bundle as a plain directory containing the same source-of-truth files. Importing a bundle folder copies its `artifact.html`, `metadata.json`, and optional `notes.md` into the active vault as a new artifact. The imported bundle records the source directory as provenance; it does not depend on the original folder after import.

Imported portable bundles always reset to `trustLevel: "untrusted"` even if their source metadata says `reviewed` or `trusted`. Trust is local and must be earned again after inspection in the destination vault.

Repeated exports do not overwrite an existing export folder; the app writes a unique suffixed folder instead.

Current bundle movement is folder-based. Zip import/export is intentionally left as a later polish step if manual folder movement feels too clunky.

## Read-only Markdown/wiki bridge

The wiki bridge indexes an existing Markdown folder without rewriting source files. It creates runtime graph nodes for `.md` pages and extracts Obsidian-style wikilinks such as `[[Page]]`, `[[Page|label]]`, and `![[Embed]]`. Markdown pages can also link to artifacts with `[[artifact:<id>]]`; those edges appear in the mixed artifact/wiki graph when the referenced artifact exists in the vault.

Bridge mode is an index/view layer only. Markdown files remain source-of-truth in their original vault until migration is explicitly proven worthwhile.

Every bridged Markdown node currently has:

```json
{
  "id": "wiki:relative/path.md",
  "kind": "wiki",
  "title": "Page title",
  "tags": [],
  "path": "/absolute/source/path.md",
  "relativePath": "relative/path.md",
  "sourceOwnership": "external-readonly",
  "wikilinks": [],
  "artifactLinks": []
}
```

`sourceOwnership` is intentionally explicit so later Markdown-native workspace work can distinguish external read-only pages from imported copies and Artifact Vault-owned pages. The current implemented state is `external-readonly`; planned states are `imported-copy` and `vault-owned`.

Unified search can return both artifact results and Markdown page results. Markdown page result matching scans title, tags, relative path, and Markdown content.

The bridge readiness report summarizes:

- pages indexed;
- wikilinks resolved vs unresolved;
- artifact links resolved vs unresolved;
- orphan Markdown pages;
- a migration posture recommendation.

Current recommendation values are intentionally conservative: unresolved links produce `investigate`; a clean bridge still reports migration as premature rather than automatically recommending replacement.
