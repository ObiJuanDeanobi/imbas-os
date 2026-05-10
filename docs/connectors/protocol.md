# Imbas OS Connector Protocol Draft

Conduit is the Imbas OS connector layer. It lets AI agents and harnesses read/write Imbas OS without touching internal SQLite/files directly.

Initial connector targets:

- OpenClaw
- Hermes
- Codex / Codex CLI-style agents
- Claude Code
- generic CLI
- generic HTTP/webhook
- MCP-style tools

## Lifecycle

### Before work

Connector asks Imbas OS for a task-specific context pack.

```http
POST /v0/context-packs
```

The context pack may include relevant memory, wiki pages, artifacts, procedures, risks, and open questions.

### During work

Connector writes context events and saves artifacts.

```http
POST /v0/events
POST /v0/artifacts
```

### After work

Connector records a run summary and may propose wiki/memory updates.

```http
POST /v0/runs
POST /v0/wiki/proposals
```

### Later retrieval

Connector searches across memory, wiki, artifacts, and runs.

```http
GET /v0/search?q=...
```

## Minimal API target

```http
POST /v0/events
POST /v0/runs
POST /v0/artifacts
GET  /v0/search?q=...
POST /v0/context-packs
POST /v0/wiki/proposals
POST /v0/snapshots
GET  /v0/status
```

This is a design target, not implemented yet.

## Event fields target

A context event should include:

- connector name;
- agent/harness name;
- run/session/project IDs;
- event type;
- candidate memory layer;
- visibility/sensitivity;
- summary/text;
- source URI/provenance;
- timestamps;
- links to artifacts/wiki/source files/issues/commits;
- redaction/secret-scan status.

## Run summary fields target

An agent run should include:

- run ID;
- agent/harness;
- task/request summary;
- outcome;
- changed files/artifacts;
- verification performed;
- decisions made;
- blockers/follow-ups;
- links to context events and artifacts;
- sensitive access audit references.

## Safety rules

- Connectors must not store raw secrets in events, runs, wiki pages, artifacts, or context packs.
- Secret-backed actions should use Sanctum handles/capabilities.
- Connectors should support dry-run/shadow mode during dogfood.
- Connectors should include provenance for durable facts and decisions.
- Connectors should avoid giant transcript dumps when a context pack/search can be more precise.


## Loopback service status

Private preview now has a Node loopback service wrapper around the Conduit handler. It can bind to `127.0.0.1` for local agents/tools and serves the same transport-neutral API used by tests. The Electron app starts it only when `IMBAS_OS_CONDUIT_LOOPBACK=1` is set; this keeps the default desktop surface conservative while we dogfood OpenClaw/Hermes shadow connectors.

Current implemented endpoints:

- `GET /v0/status` — service health, counts, implemented/pending endpoints, and module registry.
- `POST /v0/events` — redacted Imbas context event drafts.
- `POST /v0/runs` — redacted agent run summaries.

The status response includes module capability state so UI, CLI, Android, and agents can all see the same AI operating-layer world rather than maintaining hidden UI-only state.

## OpenClaw shadow connector

Sprint 2 adds `scripts/openclaw-shadow-connector.mjs`, a private-preview shadow connector that emits sanitized OpenClaw run summaries and context events to Conduit.

Default mode is dry-run:

```bash
npm run shadow:openclaw:dry-run -- --task="Smoke" --summary="Generated payload only"
```

Posting requires an explicit mode and a Conduit URL:

```bash
IMBAS_OS_CONDUIT_URL=http://127.0.0.1:39777 \
IMBAS_OS_SHADOW_CONNECTOR_MODE=post \
node scripts/openclaw-shadow-connector.mjs --task="Smoke" --summary="Posted to Conduit"
```

This connector is intentionally one-way and shadow-only. It does not change OpenClaw behavior or replace OpenClaw memory; it feeds Imbas OS so the AI-first world can be inspected, searched, and eventually evaluated.

## Durable private-preview store

Conduit now has a durable JSONL-backed private-preview store under the Imbas vault directory (`conduit/events.jsonl` and `conduit/runs.jsonl`). JSONL is deliberately simple and recoverable for this phase; public 1.0 can move to a richer store once Memsocket integration and SyncCore semantics are firmer.

## Runledger and Lorekeeper private-preview endpoints

Sprint 4 adds the first durable AI-world timeline and proposal surfaces:

- `GET /v0/runledger?query=&limit=` — searchable timeline of notable agent actions, runs, Lorekeeper proposals, and later audits.
- `GET /v0/wiki/proposals?query=&limit=` — searchable Lorekeeper managed-wiki proposals.
- `POST /v0/wiki/proposals` — create a redacted proposal for a wiki/Markdown update without mutating wiki files.
- `POST /v0/wiki/proposals/:id/approve` — mark a proposal approved, but does not yet apply it to a page.
- `POST /v0/wiki/proposals/:id/reject` — mark a proposal rejected.

Lorekeeper is proposal-first by design. Agents can suggest durable wiki knowledge, but Imbas OS does not silently rewrite human-readable notes or external vaults. Applying approved proposals to managed blocks/pages is a later guarded slice.


## Mobile companion pairing endpoints

Sprint 5 adds a private-preview Android/mobile pairing foundation:

- `POST /v0/mobile/pairing-challenges` — create a short-lived six-digit pairing challenge.
- `POST /v0/mobile/pairing-challenges/complete` — complete pairing and return a one-time `imbas_mobile_*` token.
- `POST /v0/mobile/sessions/:id/revoke` — revoke a mobile session.

Imbas OS stores session token hashes, not raw tokens. Android/mobile clients should use Conduit APIs only and must not touch internal files or databases.
