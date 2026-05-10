# Imbas Android Companion

Private-preview scaffold for the Android companion.

Stack target: Kotlin + Jetpack Compose.

This folder intentionally starts lightweight. The current sprint defines the product/API contract and pairing/session model in the main TypeScript codebase. Add the full Gradle Android project when we are ready to build on Android tooling.

See: `../../docs/mobile/android-companion.md`.

## MVP screens

- Pairing
- AI world home
- Runledger timeline
- Lorekeeper review
- Capture

## Current API dependency

The companion should talk to Conduit, not internal files/databases.

Key endpoints:

- `POST /v0/mobile/pairing-challenges/complete`
- `GET /v0/status`
- `GET /v0/runledger`
- `GET /v0/wiki/proposals`
- `POST /v0/search`
- `POST /v0/context-packs`
