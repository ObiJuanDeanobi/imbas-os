# Android companion setup

The Android companion is a pocket control surface for a local/private Imbas OS instance. It is not the source of truth; it talks to Conduit over HTTP using scoped mobile sessions.

## Prerequisites

- Android phone with Tailscale/tailnet access to the Imbas host for private testing.
- Imbas OS desktop running with Conduit bound to the tailnet IP.
- Debug APK built from this repo or supplied as a Mattermost attachment.

## Build APK

From repo root:

```bash
./apps/android/gradlew -p apps/android assembleDebug
```

The raw debug APK is written to:

```text
apps/android/app/build/outputs/apk/debug/app-debug.apk
```

Private-preview builds are usually copied into `dist/android/` with a dated filename and SHA256.

## Start Imbas OS for phone testing

Use tailnet/private binding only:

```bash
IMBAS_OS_CONDUIT_LOOPBACK=1 \
IMBAS_OS_CONDUIT_HOST=100.81.12.30 \
IMBAS_OS_CONDUIT_PORT=3077 \
npm run dev
```

Confirm status from the host:

```bash
curl http://100.81.12.30:3077/v0/status
```

Protected routes such as `/v0/runledger` should return `401` without a paired token.

## Install APK

Install the APK on the phone through a trusted private path, such as:

- Mattermost attachment;
- a temporary tailnet-only download link;
- `adb install` if available.

Do not publish APKs publicly during private preview.

## Pair the companion

1. Open Imbas OS Command Center on desktop.
2. Create an Android pairing challenge.
3. On Android, open the Pair tab.
4. Scan the QR code or manually enter challenge ID + 6-digit code.
5. Tap **Complete pairing**.
6. Confirm the app reports a paired session and scopes.

The Android app stores the returned `imbas_mobile_*` token encrypted with Android Keystore. Imbas OS stores only the token hash.

## Run diagnostics

Open the Android Diagnostics tab and run checks. Expected results:

- Status should work without pairing.
- Runledger, Lorekeeper proposals, and Events need a paired scoped session.
- After pairing, scoped reads should report OK.

## Test core mobile flows

- Status tab shows live Conduit counts.
- Runs tab shows live Runledger entries and local filtering works.
- Wiki tab shows Lorekeeper proposals with rationale/markdown/source previews.
- Approve/reject proposal actions work after pairing.
- Capture tab sends private text observations after pairing.
- Share-sheet text opens Capture as a draft.
- Dictate action opens Android speech recognition and inserts a transcript draft.

## Current limits

- Actual camera QR scan, Android speech recognition, and install/update behavior require phone testing.
- Photo capture is not implemented yet.
- Apply/restore remains desktop-guarded; Android can approve/reject proposals but should not directly mutate wiki pages.
- Public/mobile distribution and signing are not decided.
