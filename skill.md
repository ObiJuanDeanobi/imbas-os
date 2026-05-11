# Imbas OS skill

Actionable workflows for AI agents working with Imbas OS.

## Prime directive

Preserve local-first ownership, generated-artifact sandboxing, human review, and private-preview release boundaries.

## Before changing code

1. Read `README.md`, `AGENTS.md`, and this `skill.md`.
2. Check `docs/implementation-status.md` and relevant setup/how-to docs.
3. Inspect current repo state with `git status --short`.
4. Choose the smallest coherent slice.
5. Avoid public/external/destructive actions without explicit approval.

## Standard implementation loop

1. Identify the module boundary: Desktop, Android, Conduit, Lorekeeper, Runledger, Sanctum, Memsocket, docs, or release.
2. Fill the dual-surface checklist for the feature or object.
3. Make a small change.
4. Run the smallest meaningful verification gate.
5. Update docs and AI context files when behavior changes.
6. Run stronger gates before committing larger slices.
7. Commit with a clear message.
8. Record artifact paths/SHA256 when APKs or packages change.

## Dual-surface checklist

Every durable feature, subsystem, or object should define both projections over the same source of truth:

- **Source of truth:** which file/database/API record owns the durable state?
- **Human surface:** what can a human read, see, approve, undo, or troubleshoot?
- **AI surface:** what compact structured record, API, context pack, or `llms`/workflow entry can an agent ingest?
- **Stable identity:** what ID/path/ref remains stable across UI/API/context projections?
- **Provenance:** which sources, prompts, runs, commits, snapshots, or refs explain the state?
- **Trust/sensitivity:** what policy, scope, redaction, or approval boundary applies?
- **Rollback:** what snapshot, backup, restore, reject, revoke, or forget path exists?
- **Verification:** which test/build/smoke/manual gate proves both surfaces still match?

Do not create UI-only state agents cannot inspect, or machine-only records humans cannot review.

## Verification gates

Small gate:

```bash
npm test
npm run build
```

Private-preview gate:

```bash
npm run verify
```

Package gate:

```bash
npm run package:dev
```

Android touched:

```bash
./apps/android/gradlew -p apps/android assembleDebug
```

AI context gate:

```bash
npm run docs:llms
npm run docs:llms:check
```

Markdown docs touched:

```bash
python3 - <<'PY'
from pathlib import Path
import re, sys
root=Path('.').resolve(); missing=[]
for path in Path('docs').rglob('*.md'):
    for m in re.finditer(r'\[[^\]]+\]\(([^)]+)\)', path.read_text()):
        link=m.group(1); target=link.split('#',1)[0]
        if not target or link.startswith(('http://','https://','mailto:','#')): continue
        p=(path.parent/target).resolve()
        if root in p.parents or p == root:
            if not p.exists(): missing.append((str(path), link))
if missing:
    print(missing); sys.exit(1)
print('markdown links ok')
PY
```

## Lorekeeper workflow

- Propose before mutating durable wiki knowledge.
- Preserve human-owned Markdown outside managed blocks.
- Require sources for apply.
- Snapshot before apply/restore.
- Record Runledger audit evidence.

## Android workflow

- Use Conduit only; do not read Imbas files directly.
- Store mobile token with Android Keystore; Imbas stores token hash only.
- Keep apply/restore desktop-guarded.
- Build APK and record SHA256 after Android changes.

## Connector workflow

- Use stable Conduit/API boundaries.
- Do not persist raw runtime JSON or raw secrets.
- Record enough Runledger evidence to reconstruct request, context, outcome, and refs.
- Keep non-OpenClaw connector SDKs blocked/stubbed until implemented deliberately.

## Release boundaries

- Public 1.0 requires `docs/release/fresh-system-1.0-gate.md` and `docs/release/documentation-1.0-gate.md`.
- Memsocket must be first-class before public 1.0.
- MemPalace remains a safety net until migration exit criteria pass and retirement is approved.
