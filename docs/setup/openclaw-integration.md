# OpenClaw integration setup

OpenClaw currently integrates with Imbas OS through private-preview Conduit flows and a constrained local Agent Console dispatch path.

## Current private-preview integration paths

- OpenClaw shadow connector script for dry-run/posting selected context events.
- Agent Console live OpenClaw dispatch through local `openclaw agent --json --message ...` CLI adapter.
- Conduit event/run/search/context-pack endpoints.
- Lorekeeper proposal creation from Agent Console transcripts.
- Runledger records for dispatches and review/apply actions.

## Run shadow connector

Dry-run:

```bash
npm run shadow:openclaw:dry-run
```

Post mode:

```bash
npm run shadow:openclaw:post
```

Post mode writes selected events through Conduit/Memsocket boundaries when configured. Do not use it for secret-bearing content.

## Agent Console dispatch

Use the desktop Agent Console for private-preview OpenClaw dispatch. The adapter:

- normalizes live target to OpenClaw only;
- wraps user input in an Imbas OS safety prompt;
- uses JSON CLI output where possible;
- extracts reply/session/run/transport summary;
- redacts request/reply content before durable storage;
- records Runledger entries.

Non-OpenClaw live targets such as Hermes/Codex/Claude Code are blocked until connector adapters exist.

## CLI path handling

Desktop/noVNC GUI sessions may not have a complete shell `PATH`. The dispatcher resolves `/home/ubuntu/.npm-global/bin/openclaw` when present. Override with:

```bash
IMBAS_OS_OPENCLAW_COMMAND=/absolute/path/to/openclaw npm run dev
```

## Security boundaries

- Do not persist raw OpenClaw runtime JSON.
- Do not send raw secrets through context packs or dispatch prompts.
- Agent Console dispatch is desktop-only; HTTP `/v0/agents/openclaw/dispatch` is blocked on tailnet loopback exposure.
- Gateway direct integration needs deliberate auth/scope hardening before it replaces the embedded private-preview seam.

## Before public 1.0

A fresh OpenClaw config must connect to Imbas OS and prove it can:

- discover capabilities;
- append a run/event;
- save an artifact;
- retrieve a context pack;
- propose a Lorekeeper update;
- respect Sanctum redaction and approval boundaries.
