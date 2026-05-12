# Dev release plan

Imbas OS is not ready for public distribution yet, but it now has a repeatable local release gate.

## Current release posture

- Target: private/local developer preview only.
- Distribution: do not publish externally yet. Current artifact is a private/internal tarball, not an installer.
- Storage: local folder-per-artifact bundles remain the source of truth.
- Index: `.vault/index.sqlite` is a rebuildable cache and must not be required for recovery.
- Security: imported HTML remains untrusted by default; artifact-origin network requests are blocked.

## Required gate before tagging a developer preview

Run from `imbas-os/`:

```bash
npm run verify
```

For a local/private preview package, run:

```bash
npm run package:dev
```

This runs the full verification gate first, including the Android scaffold check, copies built demo HTML assets, verifies the package contents/restorability, and writes:

```text
release/imbas-os-dev-preview.tgz
```

This expands to:

```bash
npm test
npm run build
npm run android:check
npm run smoke
npm run smoke:security
npm run verify:preview
```

Expected result:

- Node tests pass.
- TypeScript + Vite build completes.
- Electron smoke opens the built app and exits cleanly.
- Security smoke imports the malicious fixture, renders it through `artifact://`, and prints `security smoke passed`.

## Headless Linux caveat

The smoke scripts may use Electron with `--no-sandbox` under `xvfb-run` when the host Chromium `chrome-sandbox` helper is not root-owned/mode `4755`. This is a host-level smoke-test workaround, not a relaxation of the artifact renderer policy. The app still uses context isolation, disables Node integration, uses Electron sandbox settings, wraps artifacts with CSP, and blocks artifact-origin network requests.

## Do not release if any of these are true

- `npm run smoke:security` fails or is skipped.
- Imported HTML gains Node/Electron bridge access.
- Artifact-origin network requests are allowed by default.
- Bundle format changes without updating `docs/file-format.md` and tests.
- Index data becomes the only copy of metadata/searchable content.
- Secrets, real customer data, or private user vaults are included in fixtures.

## Next packaging decisions

1. Decide whether the private tarball is enough for the next review, or choose Electron Forge/electron-builder for a real desktop installer.
2. Decide app signing/notarization path later; not needed for private Linux developer preview.
3. Capture screenshots/images using `docs/demo-walkthrough.md`.
4. Decide license/commercial posture before publishing any repository or binary.
5. Add zip bundle import/export if folder-based portability proves too clunky for testers.

## Rollback/recovery

- Source rollback: use git commits.
- Vault data rollback: artifact bundles are plain directories; snapshots preserve prior artifact HTML/metadata states.
- Index rollback: delete `.vault/index.sqlite` and rebuild from the app.


## Private preview restore verifier

`npm run verify:preview` lists and extracts `release/imbas-os-dev-preview.tgz`, checks required built assets/docs/package metadata, and rejects forbidden entries such as `node_modules/`, `release/`, `.git/`, `.env*`, and rebuildable `.vault/index.sqlite` caches.

See [`private-preview-restore.md`](private-preview-restore.md).
