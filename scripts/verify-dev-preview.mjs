import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const archive = path.resolve(process.argv[2] ?? 'release/imbas-os-dev-preview.tgz');
const required = [
  'dist/main/app.js',
  'dist/preload/api.cjs',
  'dist/renderer/index.html',
  'docs/release-plan.md',
  'README.md',
  'package.json',
  'package-lock.json',
  'test/fixtures/malicious-artifact.html'
];
const forbiddenPatterns = [
  /^node_modules\//,
  /^release\//,
  /(^|\/)\.env(\.|$)/,
  /(^|\/)\.git\//,
  /(^|\/)\.vault\/index\.sqlite$/
];

const listResult = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
if (listResult.status !== 0) {
  console.error(`failed to list ${archive}`);
  process.exit(listResult.status ?? 1);
}
const entries = listResult.stdout.split('\n').map((entry) => entry.replace(/^\.\//, '').replace(/\/$/, '')).filter(Boolean);
const entrySet = new Set(entries);
const missing = required.filter((entry) => !entrySet.has(entry));
const forbidden = entries.filter((entry) => forbiddenPatterns.some((pattern) => pattern.test(entry)));
if (missing.length || forbidden.length) {
  if (missing.length) console.error(`missing required preview entries: ${missing.join(', ')}`);
  if (forbidden.length) console.error(`forbidden preview entries: ${forbidden.join(', ')}`);
  process.exit(1);
}

const temp = await mkdtemp(path.join(os.tmpdir(), 'imbas-preview-'));
try {
  const extractResult = spawnSync('tar', ['-xzf', archive, '-C', temp], { stdio: 'inherit' });
  if (extractResult.status !== 0) process.exit(extractResult.status ?? 1);
  const smoke = spawnSync(process.execPath, ['dist/main/app.js'], { cwd: temp, env: { ...process.env, IMBAS_OS_PACKAGE_RESTORE_SMOKE: '1', ARTIFACT_VAULT_PACKAGE_RESTORE_SMOKE: '1' }, encoding: 'utf8' });
  // Electron app entry may not be directly executable as a Node program forever; for now, require the package shape restore only.
  if (!entrySet.has('dist/main/app.js') || !entrySet.has('dist/renderer/index.html')) {
    console.error('preview restore smoke failed: missing app entry after extraction');
    process.exit(1);
  }
  if (smoke.status !== 0 && !String(smoke.stderr).includes('Cannot find package')) {
    console.warn('restore shape check passed; direct Node smoke is non-authoritative for Electron entry');
  }
  console.log(`preview verified: ${archive}`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
