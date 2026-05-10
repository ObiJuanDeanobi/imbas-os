import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact, extractArtifactLinks, searchArtifacts, updateArtifactNotes } from '../src/main/vault/vaultStore.ts';

const linkedId = '11111111-1111-4111-8111-111111111111';

test('extractArtifactLinks finds wiki, protocol, and data attribute links once', () => {
  assert.deepEqual(extractArtifactLinks(`[[artifact:${linkedId}]] artifact://${linkedId}/ <a data-artifact-link="${linkedId}">x</a>`), [linkedId]);
});

test('searchArtifacts scans title tags notes prompt and visible html', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const pr = await createArtifact(root, {
      title: 'Annotated PR review',
      html: '<title>Annotated PR review</title><main>streaming backpressure diff</main>',
      prompt: 'Review the websocket streaming code',
      tags: ['code-review']
    });
    await createArtifact(root, {
      title: 'Lesson quiz',
      html: '<title>Lesson quiz</title><main>spaced repetition</main>',
      project: 'Learning Lab',
      tags: ['learning']
    });
    await updateArtifactNotes(root, pr.metadata.id, `# Note\n\nRelated to [[artifact:${linkedId}]]. Rollback risk is high.`);

    const htmlResults = await searchArtifacts(root, 'backpressure');
    assert.equal(htmlResults.length, 1);
    assert.equal(htmlResults[0].matchReason, 'html');

    const noteResults = await searchArtifacts(root, 'rollback');
    assert.equal(noteResults.length, 1);
    assert.deepEqual(noteResults[0].links, [linkedId]);

    const tagResults = await searchArtifacts(root, 'learning');
    assert.equal(tagResults.length, 1);
    assert.equal(tagResults[0].title, 'Lesson quiz');

    const projectResults = await searchArtifacts(root, 'Learning Lab');
    assert.equal(projectResults.length, 1);
    assert.equal(projectResults[0].matchReason, 'project');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
