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
2. Make a small change.
3. Run the smallest meaningful verification gate.
4. Update docs when behavior changes.
5. Run stronger gates before committing larger slices.
6. Commit with a clear message.
7. Record artifact paths/SHA256 when APKs or packages change.

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
