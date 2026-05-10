import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { exportMixedPromptPackage } from '../src/main/vault/mixedExport.ts';
import { createArtifact } from '../src/main/vault/vaultStore.ts';

test('exportMixedPromptPackage combines Markdown pages and HTML artifacts', async () => {
  const vaultRoot = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  const wikiRoot = await mkdtemp(path.join(os.tmpdir(), 'artifact-wiki-'));
  try {
    const artifact = await createArtifact(vaultRoot, { title: 'Decision Tool', html: '<title>Decision</title><main>Choose wisely</main>', prompt: 'Build a decision tool.' });
    await writeFile(path.join(wikiRoot, 'Brief.md'), `# Brief\nUse [[artifact:${artifact.metadata.id}]] for the next planning pass.\n`);

    const exported = await exportMixedPromptPackage(vaultRoot, wikiRoot, { artifactIds: [artifact.metadata.id], wikiPageIds: ['wiki:Brief.md'] });
    assert.match(exported, /# Mixed prompt package/);
    assert.match(exported, /Markdown pages: 1/);
    assert.match(exported, /Included HTML artifacts: 1/);
    assert.match(exported, /Source ownership: external-readonly/);
    assert.match(exported, /```markdown\n# Brief/);
    assert.match(exported, /```html\n<title>Decision<\/title>/);
  } finally {
    await rm(vaultRoot, { recursive: true, force: true });
    await rm(wikiRoot, { recursive: true, force: true });
  }
});
