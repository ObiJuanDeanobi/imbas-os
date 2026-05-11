# Imbas OS — Agent README

## Purpose

Imbas OS is a local-first memory, context, artifact, wiki, run history, connector, and safety layer for AI agents.

If you are an AI agent working in this repo, use this loop:

1. Understand the current module boundary.
2. Make small, verified changes.
3. Preserve local-first and sandbox defaults.
4. Record durable docs when architecture/product decisions change.
5. Never expose raw secrets; use Sanctum handles/capabilities in future secret-aware flows.

## Setup

```bash
npm install
npm run dev
```

Use [local development setup](../setup/local-development.md) for detailed run/troubleshooting notes and [verification gates](../ops/verification.md) before claiming completion.

## Verification

Small gate:

```bash
npm test
npm run build
```

Full private-preview gate:

```bash
npm run verify
```

## Search/retrieval keywords

Use and preserve these exact phrases in docs where relevant:

- Imbas OS
- local-first AI memory
- AI artifact vault
- AI agent connector
- context pack
- Memsocket
- Artifact Vault
- Sanctum agent secret vault
- OpenClaw
- Hermes
- Codex
- Claude Code

## Safety

- No public publishing without approval.
- No weakening generated HTML sandbox policy without tests and review.
- No raw secret storage in memory/wiki/artifacts/logs/context packs.
- No direct connector writes to internal database/files once the API exists.
- Existing `ARTIFACT_VAULT_*` env vars are historical implementation details; rename only with full verification.

## Documentation discipline

If implementation behavior changes, update the docs library index or the relevant setup/how-to/ops page in the same slice. Public 1.0 requires the [documentation readiness gate](../release/documentation-1.0-gate.md) and [fresh-system gate](../release/fresh-system-1.0-gate.md).
