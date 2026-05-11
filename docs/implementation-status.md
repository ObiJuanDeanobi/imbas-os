# Imbas OS private-preview implementation status

This page tracks the current private-preview reality against the initial issue set. It is not a public roadmap or release promise.

## Issue evidence matrix

| Issue | Area | Current evidence | Remaining / blocker |
|---|---|---|---|
| #1 | Naming/repo migration | Repo/package/docs now use Imbas OS as umbrella; Artifact Vault remains intentional subsystem/module terminology. Historical `ARTIFACT_VAULT_*` env aliases remain supported for smoke compatibility. | Final cleanup only where references are not historical/module terminology. |
| #4 | Conduit/OpenClaw connector | Conduit loopback, durable JSONL store, OpenClaw shadow connector, events/runs/search/context-packs, artifact save endpoint, and optional Memsocket write-through are implemented. | Full connector SDKs for Hermes/Codex/Claude Code and production auth/capability model. |
| #5 | Sanctum secret vault | Encrypted private-preview vault, handle/capability validation, redaction, policy-checked resolution, Conduit redaction audit, and Sanctum Runledger entries exist. | OS keyring/passphrase UX, approval UI, and real connector execution-boundary secret resolution. |
| #6 | Android companion | Kotlin/Compose Gradle scaffold, pairing/session foundation, Conduit endpoint map, VPS Android SDK/JDK/Gradle wrapper, successful `assembleDebug`, and tabbed private-preview APK exist. | Real HTTP client + secure token storage + live Conduit pairing remain. |
| #7 | Lorekeeper | Proposal-first workflow plus guarded managed-block apply with source citations and Runledger audit exists. | Rich diff/review UI and snapshot-before-apply. |
| #8 | Installer/restore | Private-preview tarball, `npm run verify:preview`, and restore/package docs exist. | Real installer/signing/notarization require release decisions. |
| #9 | Memsocket public 1.0 gate | Adapter, CLI client, optional write-through, status module, live smoke path, agentmemory pattern-harvest note, and explicit MemPalace→Imbas migration plan exist. | Public 1.0 still blocked until Memsocket is merged/integrated/tested under Imbas OS as first-class release module and Johnathan approves. MemPalace must remain active as a safety net until Imbas/Memsocket meets the migration exit criteria. Near-term design slices: provenance-rich context packs, replay timeline, memory governance proposals, and retrieval eval fixtures. |

## Current verification gates

- `npm test`
- `npm run build`
- `npm run android:check`
- `npm run verify`
- `npm run package:dev`
- `npm run verify:preview`

## Explicit blockers

- No public release, publishing, or announcement without Johnathan's explicit approval.
- No public 1.0 until the fresh-system gate in [`docs/release/fresh-system-1.0-gate.md`](release/fresh-system-1.0-gate.md) passes: brand-new OpenClaw config, Imbas OS with all supported modules, agent adapters, Android companion pairing, backup/restore, security smoke, and human review loop.
- Do not remove/disable MemPalace until the staged migration criteria in [`docs/architecture/memory-migration.md`](architecture/memory-migration.md) pass and Johnathan approves retirement.
- No production installer/signing/notarization decision has been made.
