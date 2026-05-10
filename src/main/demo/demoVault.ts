import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createArtifact, listArtifacts } from '../vault/vaultStore.js';
import type { ArtifactSummary } from '../../shared/types.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const demos = [
  { file: 'pr-review.html', title: 'Annotated PR Review', tags: ['demo-pack', 'code-review'], prompt: 'Review this PR as an annotated HTML diff with severity notes.' },
  { file: 'architecture-map.html', title: 'Imbas Artifact Workbench Architecture Map', tags: ['demo-pack', 'architecture'], prompt: 'Map the local-first artifact vault architecture and trust boundaries.' },
  { file: 'decision-matrix.html', title: 'Product Direction Decision Matrix', tags: ['demo-pack', 'strategy'], prompt: 'Compare product directions as an HTML decision matrix.' },
  { file: 'compliance-pack.html', title: 'Compliance Evidence Pack', tags: ['demo-pack', 'compliance'], prompt: 'Create an evidence pack for access-control review.' },
  { file: 'lesson-quiz.html', title: 'Interactive Learning Lesson', tags: ['demo-pack', 'learning'], prompt: 'Teach sandbox basics with a tiny interactive quiz.' },
  { file: 'incident-timeline.html', title: 'Incident Timeline', tags: ['demo-pack', 'incident'], prompt: 'Turn deploy incident notes into a scannable timeline.' },
  { file: 'throwaway-editor.html', title: 'Throwaway Brief Editor', tags: ['demo-pack', 'editor'], prompt: 'Create a tiny generated editor that exports its state back to Markdown.' }
];

export async function seedDemoVault(root: string): Promise<ArtifactSummary[]> {
  const existing = await listArtifacts(root);
  const existingDemoTitles = new Set(existing.filter((artifact) => artifact.tags.includes('demo-pack')).map((artifact) => artifact.title));
  for (const demo of demos) {
    if (existingDemoTitles.has(demo.title)) continue;
    const html = await readFile(path.join(HERE, demo.file), 'utf8');
    await createArtifact(root, { html, title: demo.title, tags: demo.tags, prompt: demo.prompt, sourceType: 'generated', model: 'demo-fixture', provider: 'local', project: 'Demo Vault' });
  }
  return listArtifacts(root);
}
