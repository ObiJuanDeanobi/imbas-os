# AI-First OS Principle

Imbas OS should be designed as an **AI-first operating layer**.

It is not primarily a conventional desktop app with AI features bolted on. It is a local-first world where agents remember, reason, generate, organize, request permissions, coordinate tools, and leave durable traces. The user interface is how humans **see into the AI's world** and safely shape it.

## Core principle

> The UI is not the source of truth. The AI operating layer is the source of truth. The UI is an observatory, cockpit, editor, and approval surface for that world.

This means the product should center the AI's working environment:

- memories and context packs;
- artifacts and snapshots;
- wiki/lore pages;
- runs, plans, tasks, and tool calls;
- graph relationships;
- uncertainty, provenance, and confidence;
- permissions, secrets, approvals, and policy decisions;
- sync, backup, restore, and forgetting.

## UI implication

Every UI view should answer one or more of these questions:

- What does the AI know?
- Where did it learn that?
- What is it working on?
- What did it create?
- What changed recently?
- What is connected to what?
- What is uncertain, stale, or conflicting?
- What needs human approval?
- What can be safely undone, exported, restored, or forgotten?

The UI should feel less like a document manager and more like looking through windows into the agent's mind/workshop/control room.

## Architecture implication

Human UI, agent connectors, CLI, Android, and automation should all speak through stable Imbas OS APIs and module contracts. Avoid letting the UI mutate hidden state directly in ways agents cannot understand.

Preferred flow:

```text
Agents / UI / CLI / Android
        ↓
Conduit APIs + module contracts
        ↓
Sanctum policy, approvals, redaction
        ↓
Memsocket, Artifact Vault, Lorekeeper, Runledger, Atlas, SyncCore
        ↓
Durable local-first state + indexes + backups
```

## Design language

The interface should expose the AI world through panes such as:

- **Memory / Context** — what the AI can retrieve and why.
- **Workshop / Artifacts** — generated things, versions, snapshots, provenance.
- **Lore / Wiki** — durable knowledge and managed blocks.
- **Runs / Ledger** — what agents did, with inputs, outputs, tools, and decisions.
- **Graph / Atlas** — relationships between people, projects, files, memories, artifacts, and runs.
- **Approvals / Sanctum** — guarded actions, secret handles, capabilities, policies, audits.
- **Sync / Recovery** — backups, devices, restore points, portability.

## Public 1.0 bar

Public Imbas OS 1.0 should demonstrate this principle end-to-end:

- agents can write useful memory/context/artifact/run data;
- humans can inspect and correct what agents know;
- provenance and uncertainty are visible;
- secrets and high-trust facts are guarded;
- Memsocket is integrated as the first-class memory/context module;
- the UI is a coherent view into the AI operating layer, not a separate app state silo.

## Sprint 4 consequence: proposal-first knowledge

The AI-first world needs a durable memory of what agents did and what knowledge they want to promote. Sprint 4 introduces this as:

- **Runledger** — a searchable timeline of notable runs/actions.
- **Lorekeeper proposals** — redacted Markdown/wiki update proposals that can be reviewed before being applied.

This keeps agents autonomous enough to prepare useful durable knowledge, while preserving human oversight before wiki mutation.

## Sprint 6 consequence: guarded knowledge promotion

Lorekeeper can now close the loop from agent proposal to durable wiki update without giving agents unconstrained write access. Approved proposals apply only to Imbas-managed Markdown blocks with source citations, and Runledger records the apply event. This makes durable knowledge promotion visible, reversible through normal file history/snapshots, and auditable.


## Automation policy direction

The long-term goal is not to make Johnathan approve every routine wiki or artifact update. Imbas OS should become self-maintaining inside explicit policy lanes: agents should be able to create, ingest, classify, link, summarize, and update low-risk knowledge automatically while keeping high-impact changes reviewable and dangerous changes gated.

Automation should be tiered:

1. **Suggest only** — create a Lorekeeper proposal or action draft, then wait for human review.
2. **Auto-apply low-risk reversible changes** — examples: backlinks, formatting, status rollups, daily notes, artifact indexes, generated summaries, and routine project-log updates. These still require source refs, Runledger audit, and rollback/snapshot support.
3. **Auto-apply trusted lanes** — per-project or per-module policies may allow agents to maintain specific managed blocks/pages/artifact collections without interrupting the human, provided changes stay inside declared scope.
4. **Require approval** — architecture decisions, release gates, security/safety policy, compliance-sensitive claims, secrets/permissions, canonical memory migration, public-facing copy, and any action Sanctum marks sensitive.
5. **Never silently execute** — destructive deletes/forget operations, public publishing, external communications, spending money, weakening sandbox/security controls, retiring MemPalace, or irreversible trust-boundary changes require explicit approval and durable evidence.

Human review is therefore a **risk control**, not the default interaction model forever. Lorekeeper starts proposal-first during private preview, but mature Imbas OS should use Sanctum policy, managed-block scopes, snapshots, citations, Runledger evidence, and easy rollback to let safe maintenance happen automatically.
