# Cross-platform security validation

Artifact Vault's security boundary depends on Electron behavior as well as repo-level tests. Linux security smoke is automated today; Windows and macOS validation must be proven on real runners/devices before closing the cross-platform gate.

Tracked issue: [Security: test artifact network blocking across Windows/macOS/Linux](https://github.com/ObiJuanDeanobi/imbas-os/issues/12)

## Current automated coverage

- Unit tests cover render policy, network-blocking predicate, CSP injection/replacement, path traversal rejection, bundle trust reset, and trust-promotion audit behavior.
- Linux Electron security smoke renders `test/fixtures/malicious-artifact.html` through `artifact://` under Xvfb.
- CI runs install/test/docs/build/android-scaffold checks on Linux, macOS, and Windows.
- CI runs Electron security smoke on Linux.

## Manual/runner evidence still needed

Before public 1.0, collect Windows and macOS evidence for artifact content attempting:

- `fetch`, XHR, `<img>`, `<script>`, `<link>`, and websocket network calls;
- popup/window creation;
- top-level navigation;
- permission prompts;
- bridge probing (`window.artifactVault`);
- Node/Electron probing (`process`, `require`).

Record the platform, OS version, Electron version, command used, commit SHA, and pass/fail result in issue #12 or a linked verification note.

## Gate

The cross-platform security gate is not closed until Windows, macOS, and Linux all have recent evidence that artifact-origin network and shell escape attempts fail closed.
