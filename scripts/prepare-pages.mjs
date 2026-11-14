import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'docs');
if (relative(root, destination) !== 'docs') throw new Error('Unexpected publication directory');
// docs contains only the generated GitHub Pages bundle; sources live in src.
await mkdir(destination, { recursive: true });
for (const entry of await readdir(destination)) {
  const target = resolve(destination, entry);
  if (relative(destination, target).startsWith('..')) throw new Error('Unexpected generated path');
  await rm(target, { recursive: true, force: true });
}
await cp(resolve(root, 'dist'), destination, { recursive: true });
await writeFile(resolve(destination, '.nojekyll'), '');
console.log('GitHub Pages bundle prepared in docs/.');
