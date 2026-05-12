# Local development setup

This guide is for running Imbas OS from a source checkout.

## Prerequisites

- Node.js 22+ recommended.
- npm.
- A Linux/macOS/Windows desktop capable of running Electron.
- On headless Linux environments, Xvfb is useful for smoke tests.

For Android companion builds, see [Android companion setup](android-companion.md).

## Clone and install

```bash
git clone https://github.com/ObiJuanDeanobi/imbas-os.git
cd imbas-os
npm install
```

This repo is public, but package-registry publishing, hosted services, signed/binary distribution changes, and announcements still require explicit maintainer approval.

## Run the desktop app

Development mode:

```bash
npm run dev
```

Production-style local run:

```bash
npm run build
npm start
```

## Run with Conduit exposed for phone testing

Bind Conduit to a tailnet/private IP, not a public interface:

```bash
IMBAS_OS_CONDUIT_LOOPBACK=1 \
IMBAS_OS_CONDUIT_HOST=<your-lan-or-tailnet-ip> \
IMBAS_OS_CONDUIT_PORT=3077 \
npm run dev
```

Android debug builds currently default to `http://10.0.2.2:3077` for emulator testing, and the URL is editable in-app. For a physical phone, set it to `http://<your-lan-or-tailnet-ip>:3077`.

## Verification gates

Small code gate:

```bash
npm test
npm run build
```

Standard local verification gate:

```bash
npm run verify
```

Package/restore gate:

```bash
npm run package:dev
```

Android scaffold check:

```bash
npm run android:check
```

Full Android APK build, if Android SDK/JDK/Gradle wrapper are available:

```bash
./apps/android/gradlew -p apps/android assembleDebug
```

## Headless Linux notes

Electron smoke tests may need `xvfb-run` and may use `--no-sandbox` on hosts where Chromium's `chrome-sandbox` helper is not root-owned mode `4755`. This is a host test workaround; generated artifact renderers still need to preserve app-level sandbox/security controls.

## Common troubleshooting

### Electron sandbox helper error

If Electron fails with a Chromium sandbox helper error after install, fix the helper ownership/mode on the host:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

### OpenClaw dispatch cannot find `openclaw`

GUI environments may have a sparse `PATH`. The dispatcher supports `IMBAS_OS_OPENCLAW_COMMAND` for explicit binary overrides. Prefer absolute paths in service/GUI environments.

### Protected Conduit routes return 401

That is expected without a scoped mobile session token. Pair Android first or use desktop IPC/Agent Console paths where appropriate.

### Restore/apply routes return 403 over HTTP

That is expected. Sensitive desktop-only actions such as Lorekeeper apply/restore and Agent Console dispatch are blocked over tailnet HTTP unless explicitly enabled by a reviewed private-preview flow.
