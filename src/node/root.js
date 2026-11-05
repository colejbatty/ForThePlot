// Locate ForThePlot's install folder (packs/, examples/, dist/), whether running
// from the repo, from an npm install, or from the bundled Claude Desktop extension.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Settings made before the rename from Epitope (EPITOPE_DIR, EPITOPE_PRISM, …) still work.
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith('EPITOPE_') && !process.env[`FORTHEPLOT_${k.slice(8)}`]) process.env[`FORTHEPLOT_${k.slice(8)}`] = v;
}

export function findRoot(fromUrl = import.meta.url) {
  if (process.env.FORTHEPLOT_ROOT) return process.env.FORTHEPLOT_ROOT;
  let dir = path.dirname(fileURLToPath(fromUrl));
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'examples'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return path.resolve(path.dirname(fileURLToPath(fromUrl)), '../..');
}

export const ROOT = findRoot();

/** Expand ~, ${HOME}, ${DOCUMENTS}, ${DESKTOP}, ${DOWNLOADS} in a path from config. */
export function expandPath(p) {
  if (!p) return p;
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const out = String(p)
    .replace(/^~(?=$|[\\/])/, home)
    .replace(/\$\{HOME\}/g, home)
    .replace(/\$\{DOCUMENTS\}/g, path.join(home, 'Documents'))
    .replace(/\$\{DESKTOP\}/g, path.join(home, 'Desktop'))
    .replace(/\$\{DOWNLOADS\}/g, path.join(home, 'Downloads'));
  return fromWindowsPath(out);
}

/** Under WSL, a Windows path (C:\Users\…) means the same file at /mnt/c/Users/…. */
export function fromWindowsPath(p) {
  if (process.platform === 'win32') return p;
  const m = /^([A-Za-z]):[\\/](.*)$/.exec(p);
  if (!m) return p;
  const drive = `/mnt/${m[1].toLowerCase()}`;
  return fs.existsSync(drive) ? `${drive}/${m[2].replace(/\\/g, '/')}` : p;
}
