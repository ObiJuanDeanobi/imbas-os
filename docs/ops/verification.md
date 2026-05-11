# Verification and test gates

Use the smallest meaningful gate before claiming work is done. Use stronger gates before committing/pushing larger private-preview changes.

## Core gates

```bash
npm test
npm run build
npm run android:check
npm run smoke
npm run smoke:security
```

Combined gate:

```bash
npm run verify
```

Private-preview package gate:

```bash
npm run package:dev
```

Android APK build:

```bash
./apps/android/gradlew -p apps/android assembleDebug
```

## What each gate proves

- `npm test`: TypeScript/Node unit and integration contracts.
- `npm run build`: main/preload/renderer compile and bundle.
- `npm run android:check`: expected Android scaffold exists.
- `npm run smoke`: Electron app can launch in smoke mode.
- `npm run smoke:security`: generated HTML sandbox/network security smoke passes.
- `npm run package:dev`: full verify, package tarball creation, and package restore verification.
- Android `assembleDebug`: APK compiles.

## Live checks

When Conduit is running for phone testing:

```bash
curl http://100.81.12.30:3077/v0/status
```

Protected mobile reads should return `401` without a paired token:

```bash
curl -i http://100.81.12.30:3077/v0/runledger
curl -i http://100.81.12.30:3077/v0/wiki/proposals
```

Sensitive desktop-only HTTP actions should stay blocked over tailnet HTTP.

## Release evidence

For every meaningful slice, record:

- commit hash;
- commands run;
- pass/fail results;
- artifact paths and SHA256 when APK/tarball changes;
- live service status if relevant;
- known manual/device checks left.
