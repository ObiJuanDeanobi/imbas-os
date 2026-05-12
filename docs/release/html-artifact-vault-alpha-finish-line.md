# HTML Artifact Vault alpha finish-line plan

This is the shared operator plan for getting from the current private repo state to an approved public HTML Artifact Vault alpha.

It is intentionally narrower than the full Imbas OS roadmap. The public alpha should prove one useful thing well: generated HTML artifacts can be saved, replayed safely, versioned, searched, documented, and handed back to AI with context.

Nothing in this plan grants permission to publish. Public repo visibility changes, package publishing, announcements, hosted services, or paid offerings still require explicit maintainer approval.

## Finish-line definition

The alpha is ready to ask for final public approval when all of these are true:

- A fresh developer can clone, install, run, import/paste an HTML artifact, replay it safely, edit metadata/notes/provenance, create/restore snapshots, search it, and export/copy context.
- The README explains the product in under one minute without claiming full Imbas OS readiness.
- The storage model is understandable on disk and has a documented migration posture toward human-readable folders and `.artifact/` bundles.
- The generated HTML sandbox/security smoke tests pass.
- No real secrets, private infrastructure details, private hostnames, private URLs, or personal data are tracked.
- Public alpha assets render well in GitHub dark/light contexts.
- The repo has license, security policy, contribution guide, issue/PR templates, roadmap, and AI-readable context files.
- The final approval boundary is explicit and still respected.

## Workstream A — Alpha product polish

Must-have public-alpha UX:

1. **First-run clarity**
   - Explain what the vault is.
   - Show where data lives locally.
   - Offer a demo artifact or import action immediately.
   - Gate: a new user can understand the first screen without reading architecture docs.

2. **Import/paste flow polish**
   - Paste/import generated HTML.
   - Choose or see a clear destination.
   - Default trust level remains `untrusted`.
   - Gate: imported artifact appears in the vault and replays without confusing hidden steps.

3. **Artifact detail and metadata**
   - Title, project, tags, prompt, provider/model, source path, trust level, notes, and provenance are easy to inspect/edit.
   - Gate: metadata edits persist and search/export reflects them.

4. **Provenance card/panel**
   - Show where the artifact came from and what is known/unknown.
   - Gate: provenance is visible without opening raw JSON.

5. **Snapshots and restore explanation**
   - Create snapshots.
   - Restore snapshots.
   - Explain that restore remains reversible.
   - Gate: restore creates evidence/a new snapshot path and does not silently destroy history.

6. **Copy/export AI context**
   - Copy or export a useful context package for the selected artifact.
   - Gate: output includes metadata, notes, prompt/provenance, safety reminder, and artifact content where appropriate.

Stretch/push-to-beta if schedule gets tight:

- full Obsidian-like nested folder tree;
- deeper unresolved-link workflows;
- graph polish beyond basic artifact/Markdown relationships;
- zip import/export;
- snapshot visual diff;
- browser extension/share target.

## Workstream B — Public GitHub story

Required public-facing materials:

- `README.md` above-the-fold story: what it is, why now, what works, what is not yet done.
- `docs/roadmap.md` simple staged roadmap plus detailed milestones.
- `docs/release/public-alpha-unveil-checklist.md` final pre-public checklist.
- Real app screenshot and workflow GIF in README.
- `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, issue templates, PR template.
- `llms.txt` and `llms-full.txt` current.

Gate:

```bash
npm run docs:llms:check
```

Manual review:

- README does not overclaim full Imbas OS.
- Roadmap is understandable to a non-insider.
- GitHub assets render in dark and light contexts.

## Workstream C — Security, privacy, and cleanup

Automated checks:

```bash
npm run check
npm run package:dev
git status --short
git grep -n -E "tail[[:alnum:]]+\.ts\.net|100\.(6[4-9]|[78][0-9]|9[0-9]|1[01][0-9]|12[0-7])\.|api[_-]?key|secret|token|password|BEGIN .*PRIVATE|PRIVATE KEY" -- . ':!package-lock.json'
```

Manual review:

- Any `token`, `secret`, or `password` hit is either a safe placeholder/test fixture or removed.
- Docs use generic placeholders for machine-specific paths and private hosts.
- Public docs say `maintainer approval`, not private chat/person-specific approval language.
- Generated HTML cannot access Node/Electron bridge and cannot make artifact-origin network requests by default.

## Workstream D — Fresh clone proof

Before requesting final public approval:

1. Use a clean checkout or disposable environment.
2. Run setup from `README.md` and `docs/setup/local-development.md`.
3. Import/paste an artifact.
4. Test metadata, notes, snapshot, restore, search, and context export.
5. Run the verification gate.
6. Record any missing step as either a docs bug or product bug.

Minimum gate:

```bash
npm install
npm run docs:llms:check
npm run check
npm run package:dev
```

## Workstream E — Approval and release switch

Only after Workstreams A-D pass:

1. Prepare final summary:
   - commit SHA;
   - verification evidence;
   - screenshot/GIF status;
   - known limitations;
   - rollback path;
   - exact proposed public actions.
2. Ask for explicit maintainer approval.
3. If approved, perform only the approved public actions.
4. After publishing, verify public README rendering and clone/setup path.

Rollback path:

- If public copy is wrong: push a corrective commit or temporarily revert repo visibility if needed.
- If a secret/private detail is found: make repo private immediately if possible, remove/rotate the exposed material, rewrite only if necessary, and document the incident privately.
- If package/build is bad: do not publish binaries/packages; keep the repo public only if source/docs are safe and clearly marked alpha.

## Current recommended next slice

Build the smallest cohesive alpha UX pass:

1. First-run orientation.
2. Import/paste destination clarity.
3. Artifact detail/provenance panel polish.
4. Snapshot browser/restore explanation.
5. Copy/export AI context button.
6. Re-run `npm run check` and `npm run package:dev`.

Do not spend the next slice on full Imbas OS integration, Android polish, or Memsocket 1.0 work unless the alpha wedge is already ready for final approval.
