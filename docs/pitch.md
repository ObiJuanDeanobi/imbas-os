# Imbas OS pitch

## One-line pitch

A local-first desktop vault for Markdown knowledge and AI-generated interactive HTML artifacts: write what you know, safely replay what AI builds, link both in one graph, and export clean context back into the next AI pass.

## The problem

AI tools increasingly generate rich HTML mini-apps: reviews, dashboards, quizzes, diagrams, evidence packs, timelines, editors, and decision tools. Meanwhile Markdown remains the best durable substrate for notes, decisions, project context, and agent-readable memory. Today these two worlds are split: HTML artifacts live in chat history, downloads folders, or one-off tabs, while Markdown vaults cannot safely manage active generated content as first-class work objects.

That creates three gaps:

- **Loss** — useful artifacts disappear after the conversation moves on.
- **Risk** — HTML is active content, but most workflows treat it like a harmless document.
- **No lifecycle** — there is no durable place for notes, snapshots, provenance, search, links, or handoff back to an agent.
- **Split context** — Markdown knowledge and interactive HTML outputs are usually managed in different tools, breaking backlinks and AI handoff.

## The product

Imbas OS keeps local-first AI memory, Markdown, and generated artifacts together. Generated HTML becomes durable local bundles:

```text
artifact.html + metadata.json + notes.md + snapshots/
```

The app then adds the missing workflow around them:

- sandboxed replay with network denied by default;
- provenance: provider, model, source prompt, local source path, hashes, trust level;
- sidecar notes and reversible snapshots;
- search and artifact links/backlinks;
- project filtering;
- Markdown, JSON, AI context package, and portable bundle-folder export;
- demo vault that shows the product in under 60 seconds;
- Obsidian/OpenClaw wiki bridge that maps Markdown pages and HTML artifacts together without replacing the Markdown source of truth;
- unified Markdown + artifact workflow: shared search, backlinks, graph, source ownership, project filters, and mixed AI context package export.

## Why now

Generated artifacts are moving from novelty to daily work product. They are too interactive for plain Markdown, too risky to run casually, and too valuable to strand in chat history.

The wedge is not “another notes app.” The wedge is **one local-first AI work vault: Markdown for durable knowledge, HTML for generated active documents, and a safe lifecycle across both**.

For Markdown/Obsidian users, the first integration posture is **integrate, not replace**: keep the existing Markdown vault as source of truth, then add secure artifact replay, provenance, search, and mixed graph exploration on top. Migration only becomes a product goal if testing proves the unified vault is safer and more useful than the current wiki/Obsidian workflow.

## Target early users

- AI builders who generate dashboards, reviews, and prototypes constantly.
- Compliance/security workers who need provenance and safe handling.
- Developers using AI artifacts for PR review, architecture, incident analysis, and learning.
- Power users who already use Obsidian/local vault workflows but need interactive artifacts, unified search, mixed prompt export, and a richer Markdown/artifact graph.

## 60-second demo path

1. Click **Seed demo vault**.
2. Open **Annotated PR Review** and show sandbox badges: network denied, no Node bridge.
3. Open **Artifact Vault Architecture Map** to explain the trust boundary.
4. Use search/project filter to jump between demo artifacts.
5. Show sidecar notes and metadata provenance.
6. Create or restore a snapshot.
7. Export a AI context package or portable bundle folder.

## Current private-preview proof

- Electron + React + TypeScript desktop app.
- Local folder-per-artifact storage with filesystem as source of truth.
- Rebuildable SQLite search cache.
- Live Electron security smoke using a malicious fixture.
- Full local verification gate: `npm run verify`.
- Initial read-only Markdown/wiki bridge with mixed graph/report foundations.
- Unified search and mixed AI context package export for Markdown pages plus linked HTML artifacts.
- Sync foundation with local node identity, source-file manifest rebuilds, changed-file detection, and conflict candidates.
- Vault-owned Markdown pages for local project notes that can link to artifacts and participate in graph/search/export.
- Private dev preview tarball: `release/imbas-os-dev-preview.tgz`.

## What is deliberately not included yet

- Hosted multi-tenant service.
- Public distribution or installer.
- Network-enabled artifact execution.
- Real-time collaboration.
- Marketplace/plugin ecosystem.
- Full cross-device sync transport; current sync work is the safe manifest/status foundation.
- Replacing Obsidian/OpenClaw wiki before bridge/unified-vault testing proves migration is worthwhile.
- Editing external Markdown vault files by default.

## Commercial wedge

Start with a trustworthy free/open-source local core. The first paid-adjacent path can be Patreon/supporter early access in US dollars for development updates, preview builds, and founder feedback — not team/business support. Later paid cloud/workspace surfaces should be a separate product line: hosted sync/backups, browser workspace, team collaboration, admin/compliance controls, managed connectors, and business support.

See [business model strategy](strategy/business-model.md).
