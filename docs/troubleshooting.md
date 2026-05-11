# Troubleshooting

This page collects common private-preview problems and expected behavior.

## Desktop app

### `npm run dev` starts but Electron does not open

Check that the renderer is listening on `127.0.0.1:5173` and the main TypeScript watch compiled successfully.

```bash
npm run build
npm run smoke
```

On headless Linux, use the configured GUI/Xvfb session or smoke-test through `xvfb-run`.

### Electron sandbox helper error

If Electron reports that `chrome-sandbox` is not configured correctly, fix host helper ownership/mode:

```bash
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

If you cannot change host permissions, smoke tests may use `--no-sandbox`, but app-level generated HTML sandbox/security tests must still pass.

### GUI/noVNC app cannot find `openclaw`

GUI sessions may have a sparse `PATH`. Use an absolute command override:

```bash
IMBAS_OS_OPENCLAW_COMMAND=/home/ubuntu/.npm-global/bin/openclaw npm run dev
```

The dispatcher also tries that known OpenClaw path automatically when present.

## Conduit and mobile pairing

### `/v0/status` works but `/v0/runledger` returns `401`

Expected. Protected mobile reads require a paired scoped mobile session token.

Pair Android through the desktop-created challenge/QR flow, then retry from the app.

### Sensitive routes return `403` over tailnet HTTP

Expected. Agent Console dispatch, Lorekeeper apply, and snapshot restore are desktop-guarded in private preview. Tailnet HTTP is for scoped mobile reads/actions, not desktop mutation paths.

### Android cannot connect to Conduit

Check:

1. Imbas OS is running.
2. Conduit is bound to the tailnet IP, not just loopback.
3. Android is on the same tailnet/private network.
4. The app's Conduit URL is correct.
5. `curl http://100.81.12.30:3077/v0/status` works from a host with tailnet access.

Run the Android Diagnostics tab after pairing.

### Pairing code fails

Possible causes:

- challenge expired;
- code typed incorrectly;
- challenge already used;
- Android is pointing at the wrong Conduit URL.

Create a new challenge in Command Center and scan the QR again.

## Android APK

### APK install blocked

Android may require allowing installs from the source app/browser. Only use trusted private delivery channels during private preview.

### QR scanner fails

The Google code scanner depends on device services/camera behavior and needs real phone validation. Manual challenge ID/code entry remains the fallback.

### Dictation unavailable

The Dictate action uses Android speech recognition. Some devices may not have a recognizer available or may require user permission/UI confirmation. The Capture text field remains editable fallback.

## Verification

### `npm run smoke` fails in a headless environment

Confirm Xvfb is installed and available. The smoke scripts use `xvfb-run`.

### `npm run package:dev` fails preview verification

The package verifier rejects unsafe or unwanted entries such as `node_modules/`, `release/`, `.git/`, `.env*`, and rebuildable caches. Inspect the error and adjust package inclusion rules before release.

## Safety reminders

- Do not expose raw VNC publicly.
- Do not publish APKs publicly during private preview.
- Do not weaken generated HTML sandbox defaults without tests and review.
- Do not remove MemPalace until migration exit criteria pass and Johnathan explicitly approves.
