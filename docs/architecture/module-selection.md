# Imbas OS Module Selection

Imbas OS should be modular by default.

Users should be able to choose which Imbas OS modules they want to install, enable, or integrate. The product should feel coherent when modules are combined, but it should not require every subsystem for every user.

## Current status

Memsocket is **not currently vendored or bundled inside this repo**.

Current Imbas OS repo includes:

- Artifact Vault desktop/workbench seed;
- Sanctum handle/redaction helpers;
- Conduit in-process API skeleton;
- Memsocket adapter mapping code that converts Imbas context events into Memsocket-compatible payloads.

Current Memsocket code remains in its own repo:

- `ObiJuanDeanobi/MemSocket`
- local checkout: `/home/ubuntu/projects/memsocket`
- branch: `vnext-local-first`

## Product principle

> Imbas OS is the umbrella. Modules should be independently understandable, selectively installable, and integrated through stable boundaries.

A user might run:

- Artifact Vault only: local generated artifact/workbench use.
- Memsocket only: local-first AI memory/context engine.
- Artifact Vault + Memsocket: artifacts linked to memory/context packs.
- Conduit only with external tools: connector/API bridge.
- Sanctum only as a shared secret/capability boundary for agent tools.
- Full Imbas OS: desktop, memory, artifacts, wiki, connectors, sync, mobile, and secret vault.

## Recommended module model

```text
imbas-os                umbrella repo/app/private preview
  packages/
    imbas-core          shared types, policies, module registry
    conduit             local API + connector SDK
    sanctum             trust/redaction/secret vault
    artifact-vault      artifact/wiki workbench module
    memsocket-adapter   adapter to Memsocket engine
    lorekeeper          managed wiki/living docs
    runledger           run history/audit trail
    atlas               graph/search/navigation
    synccore            sync/backup/import/export
  apps/
    desktop             Imbas Desktop
    mobile              Android companion
    cli                 Imbas CLI/admin tools
```

Memsocket itself can remain a sibling repo/package initially, then become one of:

1. **External dependency** — Imbas installs/uses Memsocket as an optional package/service.
2. **Git submodule/subtree** — useful for private dogfood, but more operational friction.
3. **Monorepo package** — only if we decide tight co-development is worth it.
4. **Service boundary** — Memsocket runs separately; Imbas talks to it through CLI/HTTP/MCP/JSONL.

## Recommendation

For private preview, keep Memsocket as a **separate engine repo** and make it an **optional Imbas module integration** through Conduit plus a Memsocket adapter.

For public **Imbas OS 1.0**, Memsocket should be **fully merged/integrated/tested under the Imbas OS umbrella** before release. That does not mean users must enable Memsocket at runtime; it means the public distribution, docs, tests, installer/profile story, and support matrix treat Memsocket as a first-class Imbas OS module rather than a loosely related sibling project.

Private preview posture:

- Memsocket can remain a separate repo while boundaries harden.
- Imbas OS should integrate through stable adapters/service boundaries first.
- OpenClaw/Hermes dogfood should prove the memory/context loop before consolidation.

Public 1.0 release posture:

- Memsocket code/package/service is included in the Imbas OS release plan.
- Imbas OS docs explain Memsocket as the built-in memory/context module.
- Users can choose whether to enable/configure Memsocket, but it is installed/tested as part of supported profiles.
- End-to-end tests prove events, search, context packs, artifacts, wiki links, connectors, redaction, export/delete/forget, backup/restore, and upgrade paths work together.
- Public release is blocked until this integration passes and Johnathan explicitly approves.

Reasons:

- Preserves Memsocket as a reusable local-first memory/context engine during private development.
- Avoids making Imbas OS a forced monolith too early.
- Lets users adopt Artifact Vault without enabling Memsocket, or Memsocket-focused profiles without the full desktop workbench.
- Makes Android/CLI/connectors depend on stable APIs rather than internal storage.
- Ensures public 1.0 feels like one coherent Imbas OS product, not a bundle of half-integrated repos.

## Module capability registry target

Imbas OS should expose enabled modules through status/capability discovery:

```json
{
  "modules": {
    "artifactVault": { "enabled": true, "status": "ok" },
    "memsocket": { "enabled": false, "status": "not_configured" },
    "sanctum": { "enabled": true, "status": "limited" },
    "conduit": { "enabled": true, "status": "ok" },
    "lorekeeper": { "enabled": false, "status": "planned" },
    "runledger": { "enabled": false, "status": "planned" },
    "atlas": { "enabled": false, "status": "planned" },
    "synccore": { "enabled": false, "status": "planned" }
  }
}
```

## Next implementation slices

1. Add a module registry in `imbas-core` or `src/shared/imbas`.
2. Update Conduit `/v0/status` to report module capabilities.
3. Treat Memsocket as `available/configured/enabled` rather than assumed always-on.
4. Add config for optional module enablement.
5. Add docs for install profiles:
   - artifact-workbench;
   - memory-engine;
   - agent-connector;
   - full-local;
   - mobile-companion.
