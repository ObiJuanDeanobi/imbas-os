import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('src/main/demo');
const target = path.resolve('dist/main/demo');
await mkdir(target, { recursive: true });
const entries = await readdir(source, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    await cp(path.join(source, entry.name), path.join(target, entry.name));
  }
}
console.log(`copied ${entries.filter((entry) => entry.isFile() && entry.name.endsWith('.html')).length} demo HTML assets`);
