import { readArtifact } from './vaultStore.js';
import { readMarkdownPage } from '../wiki/wikiBridge.js';
import { readMarkdownPageFromVault } from '../markdown/markdownStore.js';
import type { MixedPromptPackageInput } from '../../shared/types.js';

export async function exportMixedPromptPackage(vaultRoot: string, wikiRoot: string, input: MixedPromptPackageInput): Promise<string> {
  const artifactIds = [...new Set(input.artifactIds ?? [])];
  const wikiPageIds = [...new Set(input.wikiPageIds ?? [])];
  if (!artifactIds.length && !wikiPageIds.length) throw new Error('Select at least one Markdown page or artifact');
  const externalWikiPageIds = wikiPageIds.filter((id) => !id.startsWith('wiki:pages/'));
  if (externalWikiPageIds.length && !wikiRoot) throw new Error('Index a Markdown/wiki folder before exporting external Markdown pages');

  const pages = await Promise.all(wikiPageIds.map((id) => id.startsWith('wiki:pages/') ? readMarkdownPageFromVault(vaultRoot, id) : readMarkdownPage(wikiRoot, id)));
  const artifacts = await Promise.all(artifactIds.map((id) => readArtifact(vaultRoot, id)));

  const pageLinks = pages.flatMap((page) => page.node.artifactLinks.map((artifactId) => ({ page: page.node.relativePath, artifactId })));
  const linkedArtifactIds = new Set([...artifactIds, ...pageLinks.map((link) => link.artifactId)]);

  return `# Mixed prompt package: Markdown + HTML artifacts\n\n` +
    `Use this package to continue work across durable Markdown context and safely replayable HTML artifacts. Preserve local-first assumptions, do not add network dependencies unless explicitly requested, and treat imported HTML as active untrusted content unless reviewed.\n\n` +
    `## Package inventory\n\n` +
    `- Markdown pages: ${pages.length}\n` +
    `- Included HTML artifacts: ${artifacts.length}\n` +
    `- Referenced artifact IDs: ${[...linkedArtifactIds].sort().join(', ') || 'none'}\n\n` +
    `## Markdown pages\n\n` +
    (pages.length ? pages.map((page) => `### ${page.node.title}\n\n` +
      `- Page ID: ${page.node.id}\n` +
      `- Relative path: ${page.node.relativePath}\n` +
      `- Source ownership: ${page.node.sourceOwnership}\n` +
      `- Tags: ${page.node.tags.join(', ') || 'none'}\n` +
      `- Artifact links: ${page.node.artifactLinks.map((id) => `artifact://${id}`).join(', ') || 'none'}\n\n` +
      `\`\`\`markdown\n${page.markdown}\n\`\`\`\n`).join('\n') : '_No Markdown pages selected._\n') +
    `\n## HTML artifacts\n\n` +
    (artifacts.length ? artifacts.map((bundle) => `### ${bundle.metadata.title}\n\n` +
      `- Artifact ID: ${bundle.metadata.id}\n` +
      `- Trust level: ${bundle.metadata.trustLevel}\n` +
      `- Source type: ${bundle.metadata.sourceType}\n` +
      `- Provider/model: ${[bundle.metadata.provider, bundle.metadata.model].filter(Boolean).join(' / ') || 'not recorded'}\n` +
      `- Source path: ${bundle.metadata.sourcePath || 'not recorded'}\n` +
      `- Project: ${bundle.metadata.project || 'not recorded'}\n` +
      `- SHA-256: ${bundle.metadata.hashes.sha256Html}\n` +
      `- Tags: ${bundle.metadata.tags.join(', ') || 'none'}\n` +
      `- Explicit artifact links: ${bundle.metadata.links.map((id) => `artifact://${id}`).join(', ') || 'none'}\n\n` +
      `#### Sidecar notes\n\n${bundle.notes.trim() || '_No sidecar notes recorded._'}\n\n` +
      `#### Source prompt\n\n${bundle.metadata.prompt || '_No source prompt recorded._'}\n\n` +
      `#### HTML\n\n\`\`\`html\n${bundle.html}\n\`\`\`\n`).join('\n') : '_No HTML artifacts selected._\n') +
    `\n## Requested next pass\n\nReview the combined Markdown context and HTML artifacts. Identify inconsistencies, missing links, unsafe artifact behavior, and useful next changes. Return either a concise plan or revised self-contained HTML/Markdown snippets as requested.\n`;
}
