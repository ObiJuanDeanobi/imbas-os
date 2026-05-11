# Dual-surface information architecture

Imbas OS should treat every important piece of information as having two complementary surfaces:

1. **Human surface** — readable, visual, explanatory, emotionally and cognitively comfortable.
2. **AI surface** — compact, structured, provenance-rich, task/action-oriented, and cheap for agents to ingest.

These are not separate sources of truth. They are projections over the same durable state.

## Principle

> One source of truth, two first-class projections: human-readable and AI-operable.

A human should be able to understand the system without reading machine scaffolding. An AI agent should be able to understand and act on the same system without scraping a visually-oriented UI or guessing from prose.

## Why this matters

AI agents are now real users of the operating system. They need:

- concise summaries;
- stable IDs and links;
- action contracts;
- current status;
- provenance and confidence;
- policy/permission boundaries;
- verification gates;
- machine-readable context bundles.

Humans need:

- approachable explanations;
- visual state;
- review and approval UX;
- narratives and rationale;
- trust signals;
- escape hatches and rollback paths.

If either surface is bolted on later, the system becomes fragile: humans lose trust or agents lose context.

## Examples

### Repository docs

Human surface:

- root `README.md`;
- setup guides;
- how-to guides;
- troubleshooting;
- known limitations.

AI surface:

- `llms.txt` for compact sitemap/context;
- `llms-full.txt` for fuller context ingestion;
- `AGENTS.md` for operational rules;
- `skill.md` for task workflows.

### Artifact

Human surface:

- rendered preview;
- title/tags/project;
- sidecar notes;
- provenance card;
- snapshot browser.

AI surface:

- `metadata.json`;
- extracted visible text;
- hashes;
- trust level;
- explicit links;
- prompt-package export.

### Lorekeeper page

Human surface:

- Markdown page;
- visual diff;
- rationale;
- review/apply/restore controls.

AI surface:

- page ID;
- managed block markers;
- source refs;
- proposal JSON;
- snapshot path;
- Runledger refs.

### Runledger entry

Human surface:

- timeline card;
- summary/outcome;
- refs as clickable links;
- status badges.

AI surface:

- stable entry ID;
- kind/connector/agent/outcome;
- refs array;
- createdAt;
- searchable JSONL record.

### Android companion

Human surface:

- tabs, cards, buttons, diagnostics, filters.

AI/system surface:

- scoped mobile session;
- bearer token auth;
- capability scopes;
- Conduit route contracts;
- redacted event payloads.

## Design requirements

For any durable object, prefer adding both surfaces deliberately:

- stable ID;
- human title/summary;
- structured metadata;
- provenance/source refs;
- timestamps;
- trust/sensitivity markers;
- related Runledger refs;
- export/context-pack representation;
- human-readable explanation where needed.

## Anti-patterns

Avoid:

- UI-only state agents cannot inspect;
- machine-only records humans cannot review;
- separate human and AI docs that drift;
- generated prose with no stable refs;
- JSON blobs with no human explanation;
- agents scraping the visual UI because no API/context layer exists;
- humans approving actions without seeing source/provenance.

## Implementation guidance

Use the same durable state to produce both surfaces:

```text
Durable local state
  ├─ Human projections: UI cards, Markdown, docs, visual diffs, dashboards
  └─ AI projections: llms files, JSON records, context packs, APIs, skill workflows
```

When adding a feature, ask:

1. What does the human need to see, understand, approve, or undo?
2. What does an AI agent need to retrieve, cite, transform, or act on?
3. What is the source of truth underneath both?
4. How do we prevent the two projections from drifting?

## Public 1.0 bar

Before public 1.0, this principle should be visible in:

- docs (`README.md`, `llms.txt`, `llms-full.txt`, `AGENTS.md`, `skill.md`);
- artifacts (preview + metadata/context export);
- Lorekeeper (Markdown/diff + proposal/snapshot records);
- Runledger (timeline cards + JSONL records);
- Android (human mobile UX + scoped Conduit contracts);
- connectors (human-readable run evidence + AI-usable context packs);
- backup/restore (human recovery docs + machine-verifiable manifests).
