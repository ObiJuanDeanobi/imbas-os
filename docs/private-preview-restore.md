# Private preview package and restore path

Imbas OS private preview currently ships as a local tarball, not a public installer.

## Build package

```bash
npm run package:dev
```

This runs:

1. `npm run verify`
2. `scripts/package-dev-preview.mjs`
3. `npm run verify:preview`

The package is written to:

```text
release/imbas-os-dev-preview.tgz
```

## Restore smoke

```bash
npm run verify:preview
```

The restore verifier checks that the tarball:

- contains built desktop assets;
- contains required docs/package metadata;
- contains the malicious HTML fixture needed for future security smoke recovery;
- excludes `node_modules/`, `release/`, `.git/`, `.env*`, and rebuildable `.vault/index.sqlite` cache files;
- can be extracted into a fresh temp directory.

## Rollback

- Code rollback: `git revert <commit>` or checkout a known-good commit.
- Package rollback: use the previous `release/imbas-os-dev-preview.tgz` from local/private storage.
- Vault rollback: use artifact snapshots and plain Markdown/page files.
- Index recovery: delete `.vault/index.sqlite` and rebuild from source files.

## Not a public release

Do not publish this tarball, npm package, binary, repository, or announcement publicly without explicit Johnathan approval.
