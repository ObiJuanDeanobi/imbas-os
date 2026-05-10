import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const releaseDir = path.resolve('release');
const archive = path.join(releaseDir, 'imbas-os-dev-preview.tgz');
await mkdir(releaseDir, { recursive: true });
await rm(archive, { force: true });

const files = [
  'dist',
  'docs',
  'README.md',
  'package.json',
  'package-lock.json',
  'test/fixtures/malicious-artifact.html'
];

const result = spawnSync('tar', ['-czf', archive, ...files], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`created ${archive}`);
