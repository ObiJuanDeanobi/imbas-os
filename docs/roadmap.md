# Imbas OS public roadmap

![Imbas OS roadmap](assets/roadmap/roadmap.svg)

This is the single source of truth for getting Imbas OS off the ground as free/open-source software.

The near-term wedge is **HTML Artifact Vault first**: make AI-generated HTML artifacts easy to save, inspect, replay, version, search, export, and share locally. The broader Imbas OS roadmap grows from that base into memory, wiki, agents, mobile, sync, trust, and team/cloud capabilities.

This roadmap is public-facing once the repository is made public, but it is still a plan, not a release promise. Public repository changes, public announcements, package publishing, hosted services, and paid offerings require explicit approval.

## North star

> AI work should not evaporate when the chat ends.

LLMs are moving from raw text to Markdown, HTML, interactive simulations, slides, dashboards, and eventually richer visual media. Imbas OS should be the local-first home where those outputs become durable, inspectable, searchable, reusable, and safe.

## External validation

Preserve this positioning anchor from Andrej Karpathy's X post:

> “This works really well btw, at the end of your query ask your LLM to \"structure your response as HTML\", then view the generated file in your browser.”

Karpathy's broader point: AI output is progressing from raw text to Markdown to HTML and onward to richer interactive visual media. That validates the HTML Artifact Vault wedge: generated interactive artifacts need a real home, not just a chat bubble or a downloads folder.

## Product architecture

Imbas OS has a dual-surface information architecture:

- **Human surface:** readable UI, docs, previews, review flows, visual diffs, provenance cards, undo/restore.
- **AI surface:** compact context, structured metadata, stable IDs, APIs, `llms` files, context packs, Runledger refs, policy/action contracts.

One source of truth, two first-class projections.

## Free/open-source strategy

The local core should be free/open-source and useful on its own.

Free local core includes:

- HTML Artifact Vault desktop app;
- local folder-based vault storage;
- sandboxed replay for generated HTML;
- metadata, notes, provenance, snapshots, search, and export;
- docs and AI-readable project context;
- later: local memory, wiki, agent connectors, Runledger, Lorekeeper, Sanctum, and Android companion.

Paid offerings, if/when they happen, should be separate and should charge for hosted reliability, sync, collaboration, business controls, compliance, and managed services — not basic local ownership.

## Release lanes

### Lane A: HTML Artifact Vault OSS alpha

Goal: publish a small, honest, useful free/open-source alpha centered on generated HTML artifacts.

Scope:

- Electron desktop app.
- Paste/import AI-generated HTML.
- Safe sandboxed replay.
- Local artifact bundles with `artifact.html`, `metadata.json`, `notes.md`, and snapshots.
- Metadata editing: title, project, tags, prompt, provider/model, trust level.
- Search across title/tags/notes/prompt/visible HTML.
- Notes and provenance.
- Snapshot create/restore.
- Prompt-package/context export.
- Demo artifacts and screenshots/GIFs.
- Root `README.md`, `llms.txt`, `llms-full.txt`, `AGENTS.md`, `skill.md`, `SECURITY.md`, `CONTRIBUTING.md`, license, roadmap.

Non-goals for alpha:

- Full Imbas OS 1.0.
- Production installer/signing/notarization.
- Hosted cloud service.
- Team/workspace features.
- Fully integrated Memsocket memory engine.
- Production-grade connector auth.
- Public claims that Android/OpenClaw live dispatch are stable.

Alpha success criteria:

- A new developer can clone, install, run, import an HTML artifact, inspect metadata, create/restore snapshots, search, export a prompt package, and understand the security model.
- No secrets/private URLs/private user data are present.
- Security smoke proves untrusted HTML cannot access Node/Electron bridge and cannot make artifact-origin network requests by default.
- README makes the value obvious in under one minute.

### Lane B: Artifact Vault beta

Goal: make the HTML vault feel genuinely functional, not merely a demo.

Candidate work:

- Better first-run onboarding.
- Drag/drop import and paste polish.
- Gallery/list/detail UX improvements.
- Rich provenance cards.
- “Copy AI context” / “Export AI context pack” for artifacts.
- Zip import/export for portable bundles.
- Better snapshot diff/compare UX.
- Demo walkthrough video/GIF.
- More robust search filters and graph navigation.
- Optional browser-extension/share target research.
- More security tests around CSP, navigation, downloads, and local file boundaries.

Beta success criteria:

- The app is useful as a daily local vault for generated HTML artifacts.
- Users can safely move artifacts between machines.
- The human surface and AI surface both feel intentional.

### Lane C: Imbas OS private-preview integration

Goal: grow beyond artifact storage into the broader local-first agent OS while keeping Artifact Vault solid.

Subsystems:

- **Conduit:** stable local API/connector layer for OpenClaw first, then Hermes/Codex/Claude Code.
- **Runledger:** durable audit timeline for runs, actions, verification, and produced artifacts.
- **Lorekeeper:** reviewed wiki/proposal workflow with managed blocks, citations, snapshots, restore.
- **Memsocket:** memory/context engine, context events, search, retrieval, context packs.
- **Sanctum:** trust, redaction, approval policy, secret handles, capability scopes.
- **Atlas:** unified graph/search/navigation across artifacts, wiki, runs, memory, and projects.
- **SyncCore:** backup, restore, export/import, sync manifests, conflict detection, delete/forget propagation.
- **Android companion:** mobile capture, status, Runledger, Lorekeeper review, scoped approvals.
- **CLI:** automation/admin surface for humans and agents.

Private-preview success criteria:

- OpenClaw can save artifacts, write context events, retrieve context packs, create Lorekeeper proposals, and leave Runledger evidence.
- Humans can inspect, approve, reject, restore, and understand agent work.
- Android can pair and inspect useful live data.
- MemPalace remains available until Imbas/Memsocket migration criteria pass.

### Lane D: Imbas OS public 1.0

Goal: ship one coherent local-first Imbas OS distribution.

Required before public 1.0:

- Public 1.0 module coverage: Artifact Vault, Memsocket, Conduit, Runledger, Lorekeeper, Sanctum, Atlas, SyncCore, Desktop, Android/Mobile, and CLI each have a documented human surface, AI surface, source of truth, verification gate, and recovery/rollback story.
- Memsocket is fully merged/integrated/tested as a first-class Imbas OS module.
- Fresh-system gate passes from a clean environment.
- Documentation readiness gate passes.
- Backup/restore/delete/forget behavior is tested across memory, artifacts, wiki, and Runledger.
- Security/privacy audit passes.
- Public repo/license/release posture is approved.
- Johnathan explicitly approves public 1.0.

### Lane E: Hosted/team product later

Goal: keep the free local core trustworthy while eventually offering paid convenience and business-grade controls. This is explicitly after the local core is useful and should not block HTML Artifact Vault alpha.

Potential later scope:

- hosted sync and managed backup;
- browser-accessible workspace;
- team/org workspaces;
- shared review queues;
- admin controls and audit retention;
- compliance evidence exports;
- hosted connector infrastructure;
- managed agent runner options.

This lane is not Patreon. Patreon/supporter tiers may fund development and early access, but team/business operations should be a separate product line.

## GitHub roadmap milestones

These are intended to become GitHub milestones/issues once approved.

### M0 — Public alpha readiness

- [ ] Decide license, default recommendation: Apache-2.0 for permissive OSS with patent protection; AGPL-3.0 only if reciprocal network-use sharing is preferred.
- [ ] Add `LICENSE`.
- [ ] Add `SECURITY.md`.
- [ ] Add `CONTRIBUTING.md`.
- [ ] Add issue templates.
- [ ] Add pull request template.
- [ ] Update README around HTML Artifact Vault alpha positioning.
- [ ] Add screenshots/GIFs and demo walkthrough.
- [ ] Add public alpha status section.
- [ ] Run secret scan and private URL audit.
- [ ] Run `npm run package:dev`.
- [ ] Produce public-alpha launch checklist.

### M1 — HTML Artifact Vault alpha

- [ ] Make first-run flow obvious.
- [ ] Polish import/paste flow.
- [ ] Improve artifact detail page and metadata editing.
- [ ] Add provenance card.
- [ ] Add “Copy AI context” for selected artifact.
- [ ] Add artifact context-pack export.
- [ ] Improve snapshot browser and restore explanation.
- [ ] Document artifact bundle file format.
- [ ] Verify sandbox/security smoke.

### M2 — HTML Artifact Vault beta

- [ ] Add drag/drop import.
- [ ] Add zip bundle import/export.
- [ ] Add snapshot diff/compare.
- [ ] Improve gallery/list filters.
- [ ] Add graph/backlink polish.
- [ ] Add richer demo vault.
- [ ] Add browser/share workflow research note.
- [ ] Add installation/package path decision.

### M3 — Conduit + Runledger foundation

- [ ] Stabilize Conduit local API contracts.
- [ ] Document connector protocol.
- [ ] Harden OpenClaw connector path.
- [ ] Add run replay/export improvements.
- [ ] Add richer Runledger human cards and AI JSON refs.
- [ ] Add connector failure-path tests.

### M4 — Lorekeeper reviewed wiki

- [ ] Improve proposal creation UX.
- [ ] Improve visual diff/review.
- [ ] Finish snapshot restore UI.
- [ ] Add safe auto-apply policy lanes for low-risk managed blocks.
- [ ] Add wiki context export.
- [ ] Add source/citation quality checks.

### M5 — Memsocket first-class integration

- [ ] Merge or vendor Memsocket into Imbas OS release story.
- [ ] Add memory/context event governance.
- [ ] Add retrieval eval fixtures.
- [ ] Add context pack quality tests.
- [ ] Add MemPalace migration/import/dogfood bridge.
- [ ] Pass migration exit criteria before MemPalace retirement.

### M6 — Sanctum trust and capabilities

- [ ] OS keyring/passphrase UX.
- [ ] Secret handle/capability request UX.
- [ ] Approval queue.
- [ ] Redaction policy tests.
- [ ] Connector execution-boundary secret resolution.
- [ ] Audit/export for sensitive access.

### M7 — Android companion

- [ ] Polish QR pairing.
- [ ] Validate persisted secure session on physical phone.
- [ ] Improve mobile Runledger/Lorekeeper views.
- [ ] Add photo/audio capture polish.
- [ ] Add notification/approval research.
- [ ] Document APK/install/update flow.

### M8 — Atlas, CLI, SyncCore, and recovery

- [ ] Unified Atlas search across artifacts, wiki pages, runs, memory/context events, and projects.
- [ ] Graph/backlink navigation for artifacts, wiki, Runledger refs, and context packs.
- [ ] CLI/admin commands for verification, import/export, context-pack generation, backup/restore, and diagnostics.
- [ ] Machine-readable status output for automation and AI agents.
- [ ] Backup/restore UI.
- [ ] Portable export/import polish.
- [ ] Conflict detection UX.
- [ ] Delete/forget propagation.
- [ ] Fresh-system restore proof.

### M9 — Public 1.0 release candidate

- [ ] Run fresh-system gate.
- [ ] Run documentation readiness gate.
- [ ] Run full verification/security gate.
- [ ] Confirm public repo posture.
- [ ] Confirm installer/package plan.
- [ ] Confirm rollback/recovery plan.
- [ ] Obtain explicit Johnathan approval.

## Public alpha unveil assets

The repo should be prepared for a clean GitHub reveal before it is made public. Required visual/story assets:

- `docs/assets/brand/logo.svg` — full logo for README/header use.
- `docs/assets/brand/logo-mark.svg` — square icon/mark.
- `docs/assets/brand/logo-mark.png` — raster mark for surfaces that prefer PNG.
- `docs/assets/brand/social-card.png` — share/OpenGraph-style card.
- `docs/assets/demo/html-artifact-vault-preview.png` — static README hero preview.
- `docs/assets/demo/html-artifact-vault-flow.gif` — short animated flow demo.
- `docs/assets/roadmap/roadmap.svg` — roadmap graphic for README/docs/GitHub discussion.
- [`docs/release/public-alpha-unveil-checklist.md`](release/public-alpha-unveil-checklist.md) — repository presentation and final pre-public checklist.

Before public unveil, replace or supplement the generated concept demo with at least one real app screenshot/GIF captured from the alpha build. Keep generated concept art only if it accurately represents current behavior.

## Immediate next slice

Recommended next implementation slice:

1. Prepare public-alpha repository hygiene privately:
   - `LICENSE` decision;
   - `SECURITY.md`;
   - `CONTRIBUTING.md`;
   - issue/PR templates;
   - public alpha launch checklist.
2. Rewrite README top section for the HTML Artifact Vault alpha wedge while keeping Imbas OS roadmap visible.
3. Add demo media/artifact walkthrough.
4. Run secret/private URL audit.
5. Run `npm run package:dev`.
6. Stop for approval before making the repo public or announcing anything.

## Approval boundaries

OpenClaw may prepare docs, code, tests, screenshots, packages, and checklists privately.

OpenClaw must not, without explicit approval:

- make the GitHub repo public;
- publish packages/binaries;
- post announcements;
- contact people;
- spend money;
- create hosted services;
- weaken sandbox/security controls;
- remove MemPalace;
- claim public 1.0 readiness.
