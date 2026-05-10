# Imbas OS Android Companion MVP

The Android companion is the pocket window into the AI-first Imbas OS world.

It is not a separate source of truth. It should inspect, capture into, and approve actions for the local Imbas OS operating layer through Conduit APIs.

## MVP jobs

1. **Pair securely with desktop/local service**
   - Desktop creates a short-lived pairing challenge.
   - Android enters/scans the pairing code.
   - Android receives a scoped mobile session token once.
   - Imbas stores only token hashes.

2. **See the AI world**
   - module status;
   - recent Conduit events;
   - recent agent runs;
   - Runledger timeline;
   - Lorekeeper proposals;
   - Sanctum redaction/audit summaries.

3. **Capture lightweight context**
   - quick note;
   - link/share target;
   - photo/file placeholder later;
   - voice/text note later.

4. **Review guarded actions**
   - approve/reject Lorekeeper proposals;
   - later approve Sanctum capability requests;
   - later approve external effects.

## Stack decision

Private-preview recommendation: **Kotlin + Jetpack Compose** as the native Android app stack.

Reasons:

- best fit for Android companion UX;
- clean secure-storage story using Android Keystore/DataStore later;
- good offline/local-network behavior;
- easier native share sheet, notifications, biometrics, and QR scanning;
- avoids coupling mobile to the Electron/React renderer.

This repo currently includes a lightweight scaffold under `apps/android/` instead of a full Gradle project. The next slice can add the Gradle wrapper/project once we are ready to build on Android tooling.

## Pairing and session model

Implemented private-preview model lives in `src/main/mobile/pairing.ts` and Conduit endpoints.

Pairing flow:

```text
Desktop / local Imbas OS
  POST /v0/mobile/pairing-challenges
  → displays 6-digit code + expiry

Android
  user enters/scans code
  POST /v0/mobile/pairing-challenges/complete
  → receives imbas_mobile_* session token once

Imbas OS
  stores only token hash
  exposes session metadata/status
```

Current scopes:

- `status.read`
- `events.read`
- `runs.read`
- `runledger.read`
- `lorekeeper.read`
- `approvals.review`
- `capture.write`

## Mobile-facing Conduit endpoints

Current Sprint 5 endpoints:

- `POST /v0/mobile/pairing-challenges`
- `POST /v0/mobile/pairing-challenges/complete`
- `POST /v0/mobile/sessions/:id/revoke`

Existing read/review endpoints Android will use:

- `GET /v0/status`
- `GET /v0/events`
- `GET /v0/runs`
- `GET /v0/runledger`
- `GET /v0/wiki/proposals`
- `POST /v0/search`
- `POST /v0/context-packs`
- `POST /v0/wiki/proposals/:id/approve`
- `POST /v0/wiki/proposals/:id/reject`

## Initial screens

1. **Pairing**
   - enter code / scan QR later;
   - show service URL;
   - store mobile token securely later.

2. **Home / AI world**
   - module health cards;
   - recent runs/events;
   - Memsocket status;
   - Sanctum redaction summary.

3. **Timeline**
   - Runledger list;
   - filter/search.

4. **Lorekeeper review**
   - proposal list;
   - proposal markdown preview;
   - approve/reject buttons.

5. **Capture**
   - quick note to Conduit event;
   - share-sheet capture later.

## Safety boundaries

- Android token is scoped and revocable.
- Raw secrets must never be sent to Android.
- Secret/capability approvals should show handles/purpose/tool, not raw values.
- Pairing codes expire quickly.
- No public exposure by default; prefer tailnet/local network.
- Android should not mutate wiki pages directly; it approves proposals/actions through Conduit.
