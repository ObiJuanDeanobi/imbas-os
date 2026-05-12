# Contributing to Imbas OS

Thanks for considering a contribution. Imbas OS is early. The first public wedge is **HTML Artifact Vault**: a local-first desktop vault for AI-generated HTML artifacts.

The broader roadmap grows toward memory, wiki, agents, mobile, sync, trust, and Imbas OS 1.0, but early contributions should keep the alpha focused and safe.

## Start here

- [`README.md`](README.md) — project overview and quick start.
- [`docs/roadmap.md`](docs/roadmap.md) — canonical roadmap.
- [`AGENTS.md`](AGENTS.md) — repository rules for AI/human agents.
- [`skill.md`](skill.md) — implementation workflow and dual-surface checklist.
- [`SECURITY.md`](SECURITY.md) — security policy and sandbox expectations.

## Development setup

```bash
npm install
npm run dev
```

Useful gates:

```bash
npm test
npm run docs:llms:check
npm run build
npm run android:check
npm run check
```

Full private-preview package gate:

```bash
npm run package:dev
```

On headless Linux, Electron smoke tests may need the repo's existing `xvfb-run` flow.

## Contribution priorities

Good early contributions:

- HTML Artifact Vault import/paste/onboarding polish;
- artifact metadata/provenance improvements;
- snapshot browser/diff/restore UX;
- safe export/import workflows;
- search/filter polish;
- README/docs/examples that help new users;
- security tests around generated HTML sandboxing;
- small fixes with clear verification.

Please avoid large speculative rewrites before discussing them.

## Dual-surface checklist

Every durable feature should consider both surfaces over the same source of truth:

- human surface: what users see, review, approve, undo, or troubleshoot;
- AI surface: structured metadata/API/context/export an agent can ingest;
- stable identity/path/ref;
- provenance/source refs;
- trust/sensitivity boundary;
- rollback/snapshot/recovery path;
- verification gate.

See [`docs/architecture/dual-surface-information.md`](docs/architecture/dual-surface-information.md).

## Pull request expectations

Before opening a PR:

1. Keep the change small and focused.
2. Update docs when behavior changes.
3. Regenerate AI context if docs changed:

   ```bash
   npm run docs:llms
   ```

4. Run the smallest meaningful verification gate, preferably:

   ```bash
   npm run check
   ```

5. Note any skipped checks and why.

## Security-sensitive changes

Changes touching generated HTML replay, Electron security, filesystem access, secrets, Sanctum, auth, or connector execution boundaries need extra caution.

Do not weaken sandboxing or approval boundaries without a clear issue, tests, and maintainer review.

## License

By contributing, you agree that your contributions are licensed under the Apache License 2.0, as described in [`LICENSE`](LICENSE).
