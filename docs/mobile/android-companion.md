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
   - approve/reject Lorekeeper proposals over live Conduit POSTs;
   - later approve Sanctum capability requests;
   - later approve external effects.

5. **Capture lightweight notes**
   - send private text observations into Conduit using the paired session;
   - rely on server-side redaction before durable storage;
   - share-sheet/photo/voice capture later.

## Stack decision

Private-preview recommendation: **Kotlin + Jetpack Compose** as the native Android app stack.

Reasons:

- best fit for Android companion UX;
- clean secure-storage story using Android Keystore/DataStore later;
- good offline/local-network behavior;
- easier native share sheet, notifications, biometrics, and QR scanning;
- avoids coupling mobile to the Electron/React renderer.

The repo now includes a buildable Kotlin/Compose Gradle project under `apps/android/`, with a debug APK build gate running through the checked-in Gradle wrapper on the VPS Android SDK.

## Pairing and session model

For VPS phone testing, run the desktop app with Conduit bound to the tailnet IP, not a public interface, for example:

```bash
IMBAS_OS_CONDUIT_LOOPBACK=1 IMBAS_OS_CONDUIT_HOST=100.81.12.30 IMBAS_OS_CONDUIT_PORT=3077 npm run dev
```

The Android debug build defaults to `http://100.81.12.30:3077` and lets the tester edit the URL in-app.


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
- `POST /v0/mobile/sessions/:id/revoke` — requires the paired `Authorization: Bearer imbas_mobile_*` token for that session

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
   - enter desktop-created challenge ID and 6-digit code;
   - complete live Conduit pairing over HTTP;
   - persist the returned mobile token encrypted with Android Keystore;
   - forget/revoke the paired local session.

2. **Status / AI world**
   - module health cards;
   - recent runs/events;
   - Memsocket status;
   - Sanctum redaction summary.

3. **Timeline**
   - Runledger list;
   - filter/search.

4. **Lorekeeper review**
   - live proposal list;
   - on-device rationale, markdown preview, and source display;
   - approve/reject proposal buttons via Conduit;
   - apply remains desktop-guarded.

5. **Capture**
   - quick private note to Conduit event;
   - Android text share-sheet opens the Capture tab with a draft;
   - photo/voice capture later.

## Safety boundaries

- Android token is scoped, revocable, stored only as a hash by Imbas OS, and encrypted locally with Android Keystore on the phone.
- Raw secrets must never be sent to Android.
- Secret/capability approvals should show handles/purpose/tool, not raw values.
- Pairing codes expire quickly.
- No public exposure by default; prefer tailnet/local network.
- Android should not mutate wiki pages directly; it approves proposals/actions through Conduit.


## Loopback HTTP hardening

When Conduit is exposed over the tailnet for Android testing, server-layer HTTP guards require the paired bearer token for mobile reads and scoped actions:

- `events.read` for event search/context HTTP reads;
- `runs.read` for runs and run replay;
- `runledger.read` for Runledger;
- `lorekeeper.read` for proposal lists;
- `capture.write` for mobile capture;
- `approvals.review` for proposal approval/rejection;
- `status.read` for session revoke.

`GET /v0/status` and the short-lived pairing challenge endpoints remain available for diagnostics/pairing. Lorekeeper apply, proposal creation, artifact save, run writes, and Agent Console live dispatch remain desktop/approved-connector-only over the loopback HTTP surface.


## Desktop review companion

- Desktop Agent Console now shows a visual Lorekeeper before/after diff for proposal previews, highlights added/removed lines, and keeps apply guarded behind approval. Android still reviews proposal details and can approve/reject; managed-block apply remains desktop-only.


## QR pairing

- Command Center pairing challenges now include an `imbas://pair?...` QR payload with challenge ID, code, and the default tailnet Conduit URL.
- Android Pair tab can launch the Google code scanner, parse the Imbas pairing URI, prefill challenge/code, update the Conduit URL, and then complete the existing scoped pairing flow.
- Manual challenge ID/code entry remains available as fallback.


## Voice dictation capture

The Capture tab includes a **Dictate** action that opens Android speech recognition and inserts the returned transcript as an editable private-note draft. The draft still goes through the paired `capture.write` Conduit endpoint; no raw audio is persisted by Imbas OS.


## Runledger detail cards

The Runs tab parses Runledger `summary` and `refs` fields from Conduit and includes local filtering across title, outcome, timestamp, summary, and refs so mobile review shows enough provenance to decide whether to switch back to desktop for deeper replay or Lorekeeper work.


## Companion diagnostics

The Android app includes a Diagnostics tab that reports the active Conduit URL, stored pairing/session metadata, granted scopes, and live endpoint checks for status, Runledger, Lorekeeper proposals, and events. Protected endpoints intentionally report that pairing is required when no scoped session is available.


## Proposal filtering

The Lorekeeper tab includes local search and status chips so mobile review can narrow proposals by title, status, target page, rationale, markdown preview, and source refs before approving or rejecting.
