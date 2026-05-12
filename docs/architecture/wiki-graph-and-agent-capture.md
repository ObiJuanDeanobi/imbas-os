# Wiki graph and agent artifact capture

Artifact Vault should feel like an Obsidian-style knowledge vault for humans while giving AI agents a structured graph and safe capture path.

This page records two linked product requirements:

1. Markdown notes, folders, artifacts, runs, and wiki pages should map to each other through links, backlinks, and graph views.
2. When an AI agent generates a durable artifact, Imbas OS should be able to save it into Artifact Vault automatically with provenance.

## Obsidian-style links and graph

Human expectations:

- Markdown notes use familiar wikilinks: `[[Note]]`, `[[Folder/Note]]`, `[[Note|label]]`, and embeds like `![[Thing]]` where safe.
- Artifacts are linkable from Markdown and from other artifacts.
- Each page/artifact can show backlinks.
- A graph view can show folders, Markdown notes, artifacts, wiki pages, runs, and eventually memory/context nodes.
- Broken/unresolved links are visible and actionable, not hidden.
- Links survive reasonable moves and renames when stable IDs/frontmatter exist.

AI expectations:

- Every graph node has a stable ID, kind, title, path, source ownership, and provenance.
- Every edge has a type such as `wikilink`, `artifact-link`, `embed`, `run-produced`, `proposal-updated`, `context-used`, or `source-cites`.
- Agents can query graph neighborhoods without scraping UI.
- Context-pack export can include connected notes/artifacts/runs by traversal rules.
- Early M1/M2 work should use the shared entity/reference/edge shape in [`shared-reference-model.md`](shared-reference-model.md) so Atlas and Memsocket integration do not require a graph rewrite.

## Link forms

Artifact Vault should support at least these human-readable link forms:

```markdown
[[Project Brief]]
[[Projects/Example Project/Research Notes]]
[[Project Brief|brief]]
[[artifact:stable-artifact-id]]
[[artifact:Readable Artifact Name]]
[[run:runledger-entry-id]]
```

The AI layer may canonicalize those links into stable references:

```json
{
  "from": "wiki:Projects/Example Project/Research Notes.md",
  "to": "artifact:01H...",
  "type": "artifact-link",
  "label": "Market Map",
  "resolved": true
}
```

Readable names are for humans. Stable IDs are for durability.

## Backlinks and graph behavior

Backlinks should be available for:

- Markdown page → all pages/artifacts/runs that reference it;
- artifact → notes/pages/runs that reference or produced it;
- run → artifacts/pages/proposals/context generated or used by that run;
- folder/project → contained notes/artifacts plus incoming references.

Graph traversal should support:

- local neighborhood around the current note/artifact;
- project/folder graph;
- unresolved-link report;
- orphan note/artifact report;
- export selected neighborhood as an AI context pack.

## Wiki system integration

Artifact Vault and Lorekeeper should not be separate islands.

Desired behavior:

- Vault-owned Markdown notes are the human wiki surface.
- Lorekeeper proposals can target managed blocks inside vault-owned Markdown notes.
- External Obsidian/OpenClaw wiki folders can be indexed read-only until migration is explicitly chosen.
- Graph/search should include both vault-owned notes and read-only bridged notes, with source ownership clearly shown.
- Approved wiki changes should produce Runledger evidence and preserve snapshots/restore paths.


## Wiki and Memsocket

The wiki should tie closely into Memsocket, but with distinct responsibilities. The wiki/Lorekeeper layer is the long-term human-readable knowledge base. Memsocket is the contextual memory, agentic search, retrieval, and context-pack engine.

Wiki pages and managed blocks should index into Memsocket with stable source refs. Memsocket-derived evidence can propose wiki updates through Lorekeeper, but should not silently rewrite durable wiki pages. See [`wiki-memsocket-boundary.md`](wiki-memsocket-boundary.md).

## Agent artifact capture

When an AI agent generates a durable HTML artifact, the ideal flow is:

1. Agent run produces HTML plus title/summary/source prompt/provenance.
2. Connector sends it to Conduit with run/session/task refs.
3. Conduit redacts secret-like content and applies policy.
4. Artifact Vault stores it as an untrusted `.artifact/` bundle in the right human folder, usually `Inbox/` or the active project folder.
5. Runledger records that the run produced the artifact.
6. The artifact backlinks to the run, prompt, related notes, and any source context used.
7. Human can review, rename, move, trust, snapshot, annotate, or archive it.

## Release boundary

This should be staged deliberately.

### Artifact Vault public alpha

Public alpha should focus on the local workbench:

- human folder tree;
- Markdown/artifact links;
- backlinks and graph basics;
- manual paste/import/save flows;
- a documented local API or CLI-shaped seam for saving artifacts;
- clear provenance fields for artifacts that came from AI tools.

Automatic capture from OpenClaw/Hermes/Codex/Claude Code does **not** need to be public-stable in the standalone Artifact Vault alpha, but the storage model should be ready for it.

### Imbas OS private-preview / integration lane

Automatic agent capture belongs primarily in the Imbas OS integration lane:

- Conduit connector contracts;
- Runledger refs;
- Sanctum redaction/policy;
- Lorekeeper proposal links;
- context-pack links;
- agent-specific save hooks;
- opt-in/approval settings for what gets saved automatically.

OpenClaw dogfood can implement auto-capture earlier as private-preview infrastructure, but public copy should not imply every AI tool auto-saves until the connector path is hardened.

## Safety and policy

Automatic capture must not become silent junk collection or secret leakage.

Required controls:

- save generated HTML as `untrusted` by default;
- redact or block secret-like content before durable storage;
- preserve source prompt/model/provider/run provenance;
- let users configure destination rules: active project, `Inbox/`, or ask every time;
- avoid saving low-value scratch output unless configured;
- expose a Runledger trail for automatic saves;
- allow delete/archive/export without breaking graph integrity.
