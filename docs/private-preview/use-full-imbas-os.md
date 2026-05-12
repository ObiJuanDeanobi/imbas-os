# Full Imbas OS private-preview workflow

This guide describes the broader private-preview workflow for humans using the desktop app, Agent Console, Conduit, Runledger, Lorekeeper, and Android companion.

For the public Artifact Vault alpha workflow, use [`../how-to/use-artifact-vault.md`](../how-to/use-artifact-vault.md).

## Mental model

Imbas OS is the home base. Agents and apps connect to it through stable APIs. It stores artifacts, wiki knowledge, context events, Runledger history, snapshots, and safety audit trails.

## Start the desktop app

```bash
npm run dev
```

For phone testing, start with Conduit bound to a tailnet/private IP:

```bash
IMBAS_OS_CONDUIT_LOOPBACK=1 IMBAS_OS_CONDUIT_HOST=127.0.0.1 IMBAS_OS_CONDUIT_PORT=3077 npm run dev
```

## Command Center

Use Command Center to inspect:

- module health;
- artifact/wiki/run/proposal/mobile/sync metrics;
- recent Runledger and Lorekeeper activity;
- Android pairing challenges;
- MemPalace → Imbas/Memsocket migration posture.

## Agent Console

Use Agent Console to stage chat/task messages for OpenClaw private-preview dispatch.

Typical loop:

1. Pick OpenClaw as target.
2. Write a bounded request.
3. Dispatch.
4. Review the reply action card.
5. Replay the Runledger entry, save an artifact, create a Lorekeeper proposal, or build a context pack.

Do not use Agent Console for destructive/external actions without explicit approval.

## Artifacts

Artifacts are generated/imported HTML mini-tools or documents. They are replayed through the app's sandboxed artifact protocol.

Use artifacts for:

- generated UI mockups;
- analysis reports;
- compliance packs;
- decision matrices;
- AI context packages.

## Lorekeeper wiki

Lorekeeper handles durable Markdown knowledge through proposal-first review.

Use it for:

- project decisions;
- implementation status;
- runbooks;
- architecture notes;
- source-backed memory/wiki updates.

Human-owned Markdown outside managed blocks should stay preserved.

## Runledger

Runledger is the timeline of what happened: runs, proposals, redactions, applies/restores, and other audit-relevant events.

Use it to answer:

- what was requested;
- which connector/agent acted;
- what changed;
- what evidence or refs exist;
- what still needs review.

## Android companion

Use Android for pocket review/capture:

- pair with desktop-created QR/challenge;
- check diagnostics;
- inspect status and Runledger;
- approve/reject Lorekeeper proposals;
- capture text/share-sheet/voice-dictation notes.

Android should not directly apply wiki changes; apply/restore remains desktop-guarded.
