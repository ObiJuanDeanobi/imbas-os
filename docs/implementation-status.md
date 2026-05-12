# Imbas OS private-preview implementation status

This page tracks the current private-preview reality against the initial issue set. It is not the roadmap; use [`roadmap.md`](roadmap.md) as the single source of truth for the HTML Artifact Vault first / Imbas OS public roadmap.

## Issue evidence matrix

| Issue | Area | Current evidence | Remaining / blocker |
|---|---|---|---|
| #1 | Naming/repo migration | Repo/package/docs now use Imbas OS as umbrella; Artifact Vault remains intentional subsystem/module terminology. Historical `ARTIFACT_VAULT_*` env aliases remain supported for smoke compatibility. | Final cleanup only where references are not historical/module terminology. |
| #4 | Conduit/OpenClaw connector | Conduit loopback, durable JSONL store, OpenClaw shadow connector, events/runs/search/provenance-rich context-packs, run replay timeline, artifact save endpoint, optional Memsocket write-through, and Agent Console v0.1 live OpenClaw dispatch through a constrained local CLI adapter are implemented with Runledger request/reply capture. | Full connector SDKs for Hermes/Codex/Claude Code, richer approval UX, and production auth/capability model. |
| #5 | Sanctum secret vault | Encrypted private-preview vault, handle/capability validation, redaction, policy-checked resolution, Conduit redaction audit, and Sanctum Runledger entries exist. | OS keyring/passphrase UX, approval UI, and real connector execution-boundary secret resolution. |
| #6 | Android companion | Kotlin/Compose Gradle project, Android SDK/JDK/Gradle wrapper, tabbed private-preview APK, live HTTP status/runledger/proposal fetch with offline demo fallback, desktop-created pairing challenge UI with QR payload, Android QR scan prefill, live pairing completion, Android Keystore-encrypted mobile token storage, authenticated session revoke, proposal approve/reject POSTs, proposal rationale/markdown/source preview, private note capture/voice draft POSTs, companion diagnostics, and server-side loopback guards for mobile-scoped reads/actions are implemented. | Photo capture, richer restore UX, and biometric/keychain polish remain. |
| #7 | Lorekeeper | Proposal-first workflow plus guarded managed-block apply with source citations, non-mutating before/after preview, desktop visual line diff, approve-before-apply action guard, on-disk markdown snapshot before apply, desktop snapshot listing/preview, Runledger audit, Command Center proposal summary, and Agent Console transcript-to-artifact/proposal path exist. | Tiered Lorekeeper automation policy implementation for safe auto-apply lanes versus approval-required lanes, plus guarded restore UI for saved markdown snapshots with safety snapshots before rollback. |
| #8 | Installer/restore | Private-preview tarball, `npm run verify:preview`, restore/package docs, verification ops guide, and backup/restore/delete/forget readiness plan exist. | Real installer/signing/notarization require release decisions; clean-machine restore evidence still needed. |
| #9 | Memsocket public 1.0 gate | Adapter, CLI client, optional write-through, status module, live smoke path, agentmemory pattern-harvest note, and explicit MemPalace→Imbas migration plan exist. | Public 1.0 still blocked until Memsocket is merged/integrated/tested under Imbas OS as first-class release module and the maintainer approves. MemPalace must remain active as a safety net until Imbas/Memsocket meets the migration exit criteria. Near-term design slices: deeper memory governance proposals, retrieval eval fixtures, and policy-controlled auto-maintenance for low-risk wiki/artifact updates. |

## Current verification gates

- `npm test`
- `npm run build`
- `npm run android:check`
- `npm run verify`
- `npm run package:dev`
- `npm run verify:preview`

## Explicit blockers

- No public release, publishing, or announcement without explicit maintainer approval.
- No public 1.0 until the fresh-system gate in [`docs/release/fresh-system-1.0-gate.md`](release/fresh-system-1.0-gate.md) passes: brand-new OpenClaw config, Imbas OS with all supported modules, agent adapters, Android companion pairing, backup/restore, security smoke, and human review loop.
- Do not remove/disable MemPalace until the staged migration criteria in [`docs/architecture/memory-migration.md`](architecture/memory-migration.md) pass and the maintainer approves retirement.
- No production installer/signing/notarization decision has been made.

## Documentation library / 1.0 readiness

- `docs/index.md` is the canonical documentation map; root `README.md` is the single GitHub README.
- Setup guides now cover local development, Android companion, and OpenClaw integration.
- How-to guides cover day-to-day Imbas OS usage and Lorekeeper review.
- Ops/release docs cover verification, backup/restore/delete/forget, documentation readiness, and the fresh-system public 1.0 gate.
- Remaining doc work before public 1.0: validate every setup/use guide in a fresh environment and turn any missing step into a docs bug or product bug.
