import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createArtifact, createArtifactFromFile, exportArtifactBundleToDirectory, importArtifactBundleFromDirectory, initVault, listArtifacts, readArtifact, sha256 } from '../src/main/vault/vaultStore.ts';

test('initVault creates a portable vault structure', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    const vault = await initVault(root);
    assert.equal(vault.root, root);
    assert.equal(vault.artifactCount, 0);
    assert.ok(vault.artifactsDir.endsWith('artifacts'));
    assert.match(await readFile(path.join(root, '.vault', 'manifest.json'), 'utf8'), /"version": 1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createArtifact writes artifact.html metadata.json notes.md and first snapshot', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  const html = '<!doctype html><html><head><title>Review artifact</title></head><body>ok</body></html>';
  try {
    const created = await createArtifact(root, { html, sourceType: 'paste', tags: ['review'] });
    assert.equal(created.metadata.title, 'Review artifact');
    assert.equal(created.metadata.trustLevel, 'untrusted');
    assert.equal(created.metadata.hashes.sha256Html, sha256(html));
    assert.match(await readFile(path.join(created.bundlePath, 'artifact.html'), 'utf8'), /Review artifact/);
    assert.match(await readFile(path.join(created.bundlePath, 'metadata.json'), 'utf8'), /"trustLevel": "untrusted"/);
    assert.match(await readFile(path.join(created.bundlePath, 'notes.md'), 'utf8'), /^# Review artifact/);
    const listed = await listArtifacts(root);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, created.metadata.id);
    const reread = await readArtifact(root, created.metadata.id);
    assert.equal(reread.html, html);
    assert.equal(reread.metadata.snapshotCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('readArtifact rejects path traversal ids', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  try {
    await assert.rejects(() => readArtifact(root, '../secret'), /Invalid artifact id/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('createArtifactFromFile imports html files with file provenance', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  const inputDir = await mkdtemp(path.join(os.tmpdir(), 'artifact-input-'));
  const filePath = path.join(inputDir, 'decision-grid.html');
  try {
    await writeFile(filePath, '<!doctype html><html><head><title>Decision grid</title></head><body>ok</body></html>');
    const imported = await createArtifactFromFile(root, filePath);
    assert.equal(imported.metadata.title, 'Decision grid');
    assert.equal(imported.metadata.sourceType, 'file');
    assert.equal(imported.metadata.sourcePath, filePath);
    assert.deepEqual(imported.metadata.tags, ['imported']);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(inputDir, { recursive: true, force: true });
  }
});

test('portable bundle export and directory import round-trip artifact content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  const secondRoot = await mkdtemp(path.join(os.tmpdir(), 'artifact-vault-'));
  const exportRoot = await mkdtemp(path.join(os.tmpdir(), 'artifact-export-'));
  try {
    const created = await createArtifact(root, {
      title: 'Portable artifact',
      html: '<!doctype html><title>Portable artifact</title><main>move me</main>',
      prompt: 'Make this portable.',
      project: 'Portability',
      tags: ['portable']
    });
    const exportedPath = await exportArtifactBundleToDirectory(root, created.metadata.id, exportRoot);
    assert.match(await readFile(path.join(exportedPath, 'artifact.html'), 'utf8'), /move me/);
    const secondExportPath = await exportArtifactBundleToDirectory(root, created.metadata.id, exportRoot);
    assert.notEqual(secondExportPath, exportedPath);

    const metadataPath = path.join(exportedPath, 'metadata.json');
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    metadata.trustLevel = 'trusted';
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    const imported = await importArtifactBundleFromDirectory(secondRoot, exportedPath);
    assert.equal(imported.metadata.title, 'Portable artifact');
    assert.equal(imported.metadata.project, 'Portability');
    assert.equal(imported.metadata.prompt, 'Make this portable.');
    assert.equal(imported.metadata.trustLevel, 'untrusted');
    assert.deepEqual(imported.metadata.tags, ['portable']);
    assert.match(imported.html, /move me/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
    await rm(exportRoot, { recursive: true, force: true });
  }
});
