# Public alpha unveil checklist

Use this before making the Imbas OS repository public or announcing the HTML Artifact Vault alpha.

Nothing in this checklist grants approval to publish. The final public-repo switch, package publishing, and announcements require explicit Johnathan approval.

## GitHub repository presentation

Recommended repository description:

> Local-first vault for AI-generated HTML artifacts — save, sandbox, version, search, and export interactive LLM outputs.

Recommended topics:

- `ai`
- `llm`
- `html-artifacts`
- `local-first`
- `electron`
- `typescript`
- `ai-agents`
- `knowledge-management`
- `artifact-vault`
- `imbas-os`

Recommended social preview image:

- `docs/assets/brand/social-card.png`

## Visual assets

Current prepared assets:

- Real alpha screenshot: [`../assets/demo/html-artifact-vault-real-alpha.png`](../assets/demo/html-artifact-vault-real-alpha.png)

- Full logo: [`../assets/brand/logo.svg`](../assets/brand/logo.svg)
- Logo mark SVG: [`../assets/brand/logo-mark.svg`](../assets/brand/logo-mark.svg)
- Logo mark PNG: [`../assets/brand/logo-mark.png`](../assets/brand/logo-mark.png)
- Social card: [`../assets/brand/social-card.png`](../assets/brand/social-card.png)
- README hero image: [`../assets/demo/html-artifact-vault-real-alpha.png`](../assets/demo/html-artifact-vault-real-alpha.png)
- README flow GIF: [`../assets/demo/html-artifact-vault-flow.gif`](../assets/demo/html-artifact-vault-flow.gif)
- Roadmap graphic: [`../assets/roadmap/roadmap.svg`](../assets/roadmap/roadmap.svg)

Before reveal:

- [x] Capture at least one real app screenshot from the alpha build.
- [x] Capture or generate a short workflow GIF: paste/import HTML → preview → metadata/snapshot/search/export.
- [x] Keep concept art only if it accurately represents current behavior.
- [ ] Confirm assets render in GitHub README dark/light contexts.

## README check

The README should answer, above the fold:

- What is this? HTML Artifact Vault first, broader Imbas OS later.
- Why now? AI output is moving from text/Markdown into HTML/interactive artifacts.
- What can I do today? Save, sandbox, version, search, and export generated HTML.
- Is it safe? Untrusted HTML is sandboxed and network-blocked by default.
- Is it free/open source? Local core is intended to be free/open-source.
- Is full Imbas OS done? No; roadmap is staged and explicit.

## Required repo hygiene

- [x] `LICENSE` present.
- [x] `SECURITY.md` present.
- [x] `CONTRIBUTING.md` present.
- [x] Issue templates present.
- [x] Pull request template present.
- [x] `docs/roadmap.md` current.
- [x] `llms.txt` current.
- [x] `llms-full.txt` regenerated with `npm run docs:llms`.
- [x] No stale private-preview-only claims in public-facing README copy.
- [x] No real secrets, tokens, private URLs, private hostnames, or personal data in tracked files; placeholder/test secret-like strings are documented or redaction fixtures.

## Verification gate

Run:

```bash
npm run docs:llms:check
npm run check
npm run package:dev
```

Recommended extra audit before public switch:

```bash
git status --short
git grep -n -E "tail[[:alnum:]]+\.ts\.net|100\.(6[4-9]|[78][0-9]|9[0-9]|1[01][0-9]|12[0-7])\.|api[_-]?key|secret|token|password|BEGIN .*PRIVATE|PRIVATE KEY" -- . ':!package-lock.json'
```

Any hit must be reviewed. Some words like `token` may be legitimate in docs/code, but public/private infrastructure details and real secrets must not ship.

## Launch copy seed

Short:

> Imbas OS starts with HTML Artifact Vault: a local-first desktop vault for AI-generated HTML artifacts. Paste or import generated HTML, replay it safely, add metadata/notes, snapshot versions, search your artifacts, and export context for the next AI pass.

Longer:

> LLM output is moving beyond plain text and Markdown into HTML, slides, dashboards, simulations, and interactive mini-tools. Those artifacts deserve a durable local home. Imbas OS launches with HTML Artifact Vault first: sandboxed replay, provenance, snapshots, search, and AI-context export for generated HTML — with the broader local-first agent OS roadmap behind it.

## Stop conditions

Do not unveil if:

- security smoke fails;
- README overclaims full Imbas OS readiness;
- public alpha cannot be run from a clean checkout;
- tracked files include secrets/private infrastructure details;
- license is undecided;
- Johnathan has not approved the final public action.
