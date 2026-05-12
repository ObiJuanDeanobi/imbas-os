# How to use Imbas Artifact Vault

This guide covers the public alpha surface: saving, replaying, reviewing, searching, snapshotting, and exporting AI-generated HTML artifacts locally.

For broader private-preview Imbas OS workflows such as Agent Console, Conduit, Runledger, Lorekeeper, Android companion, Sanctum, and OpenClaw dispatch, see [`../private-preview/use-full-imbas-os.md`](../private-preview/use-full-imbas-os.md).

## Start the desktop app

```bash
npm run dev
```

For a production-style local run from source:

```bash
npm run build
npm start
```

## First 60 seconds

1. Click **Seed demo vault** or import/paste an HTML file.
2. Open an artifact in the sandboxed preview.
3. Add a note and a tag.
4. Record provenance such as prompt, provider/model, project, or source path when known.
5. Create a snapshot before making risky changes.
6. Click **Copy AI context**.
7. Paste that context into an AI model and ask it to critique, revise, or extend the artifact.

Success looks like this: the generated HTML is no longer trapped in a chat thread. It is a local artifact with metadata, notes, provenance, snapshots, searchability, and an AI-ready handoff.

## Import or paste HTML

Use Artifact Vault for single-file generated HTML outputs such as dashboards, explainers, reports, calculators, slides, compliance/evidence views, prototypes, and internal tools.

Imported artifacts start as `untrusted`. Keep that trust level until you have reviewed what the artifact does and where it came from.

## Preview safely

Artifacts replay through the app's `artifact://` viewer. The alpha policy treats generated HTML like hostile active content:

- no Node/Electron/system/filesystem access;
- no direct app-shell bridge access;
- artifact-origin network requests blocked by default;
- runtime permission prompts denied;
- popups/new windows denied;
- artifact-initiated top-level navigation blocked.

Do not store secrets, credentials, customer data, or sensitive personal information in artifact HTML, notes, prompts, or context packages.

## Add metadata and notes

Use metadata to make artifacts findable and reviewable:

- title and project;
- tags;
- original prompt;
- provider/model;
- source path when known;
- trust level and trust-review reason.

Use notes for human context: why the artifact exists, what changed, follow-ups, caveats, review findings, links, and next AI instructions.

## Snapshot before changing

Create a snapshot before substantial edits or trust-level changes. Snapshot restore is designed to be reversible: restoring an older snapshot records the current state first, then restores the selected version.

## Search and connect

Artifact Vault searches artifact titles, tags, notes, prompts, and visible HTML text. Vault-owned Markdown pages and read-only external Markdown/wiki bridges can connect artifacts to project notes and backlinks.

## Copy AI context

**Copy AI context** creates a Markdown handoff containing:

- artifact metadata;
- provenance;
- trust/audit context;
- notes;
- visible text extracted from the HTML;
- snapshot history;
- fenced HTML.

Use it when you want another AI model to continue the artifact without losing the local context and safety assumptions.

## Current alpha boundaries

This public alpha is source-run desktop software. It does not yet provide signed installers, package-registry releases, hosted sync, or stable public APIs for the broader Imbas OS private-preview subsystems.
