# Threat model

Imported HTML artifacts are untrusted active content.

They may contain JavaScript, forms, remote resources, phishing UI, hidden prompt injection, tracking pixels, or attempts to access Electron/Node APIs.

## Security goals for Slice 1

- Artifact content must not access Node/Electron APIs.
- Artifact content must not access the preload bridge exposed to the app UI.
- Artifact content must not inherit same-origin access to the app.
- Artifact-origin network requests should be blocked by default.
- Provenance and source details should be visible to the user.

## Current controls

Implemented in the skeleton:

- Main app window uses:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- Artifact viewer uses iframe sandbox:
  - `sandbox="allow-scripts"`
  - deliberately no `allow-same-origin`
- Artifact HTML is served through an `artifact://<id>/` protocol handler.
- Render policy injects CSP:
  - `default-src 'none'`
  - `connect-src 'none'`
  - `base-uri 'none'`
  - `form-action 'none'`
  - `frame-ancestors 'none'`
- Web request hook blocks remote `http`, `https`, `ws`, and `wss` requests when initiated by artifact origin/referrer.
- Test fixture attempts to read `process`, `require`, the app bridge, and make a remote fetch.
- Portable bundle imports reset trust to `untrusted` rather than accepting source bundle trust metadata.
- Read-only Markdown/wiki bridge indexes selected folders without rewriting source files.

## Current verification

Automated tests cover:

- default untrusted policy denies network and same-origin privileges;
- network blocker predicate cancels remote requests by default;
- CSP injection occurs;
- artifact IDs reject path traversal;
- portable bundle creation writes expected files;
- portable bundle import resets inherited trust metadata to `untrusted`;
- repeated portable exports avoid overwriting existing export folders;
- wiki bridge parsing/indexing preserves source Markdown files as read-only inputs.

Electron smoke is verified with:

```bash
npm run smoke
npm run smoke:security
```

The security smoke imports `test/fixtures/malicious-artifact.html`, renders it through the real `artifact://` protocol, and exits successfully only when the fixture reports:

- `typeof process: undefined`
- `typeof require: undefined`
- `typeof artifactVault bridge: undefined`
- `network fetch: blocked`

The VPS smoke command uses `--no-sandbox` because the downloaded Chromium sandbox helper is not root-owned/mode `4755` in this environment. This is a host-level smoke-test caveat, not a product decision to disable Electron/browser isolation for users.

## Known gaps

- Security smoke covers one live malicious fixture, but broader hostile fixture coverage is still needed.
- Network-blocking is based on Electron request metadata; this needs more cross-platform testing.
- CSP policy is injected but not yet normalized against existing CSP tags.
- No trust-promotion workflow beyond direct metadata editing yet.
- Wiki bridge currently trusts local filesystem selection; it now reports unresolved links/orphans, but still needs broader dry-run testing before broad vault migration.
- No packaged build/hardened distribution yet.

## Hard rule

Do not call artifacts “safe” based on sanitization alone. The primary boundary is isolation: sandbox, no app bridge, no Node, no network by default.
