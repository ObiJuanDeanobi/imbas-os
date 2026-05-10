# Demo walkthrough

Use this to capture screenshots/GIFs or walk someone through the private preview.

## Setup

```bash
npm install
npm run verify
npm start
```

On the VPS/headless environment, use the existing smoke scripts rather than manual GUI capture.

## Walkthrough beats

1. **Empty vault**
   - Show the local vault path.
   - Point out that nothing is uploaded.
   - Mention the filesystem bundle format.

2. **Seed demo vault**
   - Click **Seed demo vault**.
   - Show the 60-second tour panel and seven demo artifacts.

3. **Safe replay**
   - Select **Annotated PR Review**.
   - Point at the security chips: network denied, no Node bridge.
   - Mention that imported HTML is active content and starts `untrusted`.

4. **Why this beats chat history**
   - Select **Artifact Vault Architecture Map**.
   - Show project metadata, prompt provenance, hash, and bundle path.
   - Add a short sidecar note and save it.

5. **Search and organization**
   - Search for `sandbox`, `compliance`, or `decision`.
   - Filter to `Demo Vault`.
   - Rebuild the SQLite index and explain it is a cache, not the source of truth.

6. **Version safety**
   - Create a snapshot.
   - Restore a snapshot if needed.
   - Emphasize that restore records another snapshot so the action remains reversible.

7. **Agent handoff**
   - Export **Prompt package**.
   - Show that the artifact can re-enter the AI loop with metadata, notes, prompt, links, and fenced HTML.

8. **Portability**
   - Export **Bundle folder**.
   - Re-import that folder into another vault/root later.

## Screenshot/GIF checklist

- Sidebar with 60-second tour and demo vault list.
- Sandboxed artifact viewer with PR review.
- Metadata/provenance panel.
- Sidecar notes + snapshot controls.
- Search/index state.
- Prompt-package export.
- Bundle-folder export confirmation.

## Safety callout

Do not demo by disabling sandbox/security policy. The only `--no-sandbox` usage is the VPS Electron smoke-test host workaround under Xvfb; it is not a product policy change.
