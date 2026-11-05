// "My icons": icons you saved from your own figures, kept in one pack file so every figure,
// the editor and the MCP server can use them.
//   FORTHEPLOT_MY_ICONS=<file>   or   Documents/ForThePlot/my-icons.json   (else ~/.fortheplot/my-icons.json)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerPack, getIcon, sanitizeSvg } from '../icons/registry.js';
import { emptyMyIconsPack, uniqueIconId, MY_ICONS_PREFIX, iconSlug } from '../core/saveicon.js';
import { expandPath } from './root.js';

function writableDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); return true; } catch { return false; }
}

export function myIconsFile() {
  const env = expandPath(process.env.FORTHEPLOT_MY_ICONS);
  if (env && !env.includes('${')) return env;
  const home = process.env.USERPROFILE || process.env.HOME || os.homedir();
  const docs = path.join(home, 'Documents', 'ForThePlot');
  const file = path.join(docs, 'my-icons.json');
  // icons saved before the rename (Documents/Epitope) move over once
  const old = path.join(home, 'Documents', 'Epitope', 'my-icons.json');
  if (!fs.existsSync(file) && fs.existsSync(old) && writableDir(docs)) { try { fs.copyFileSync(old, file); } catch { /* keep going */ } }
  if (fs.existsSync(file) || writableDir(docs)) return file;
  return path.join(home, '.fortheplot', 'my-icons.json');
}

export function readMyIcons(file = myIconsFile()) {
  try {
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (/^(fortheplot|epitope)-icon-pack$/.test(pack.format) && Array.isArray(pack.icons)) return { ...emptyMyIconsPack(), ...pack, prefix: MY_ICONS_PREFIX };
  } catch { /* none yet */ }
  return emptyMyIconsPack();
}

function writeMyIcons(pack, file = myIconsFile()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(pack, null, 1));
  fs.renameSync(tmp, file);
}

/** Register the saved icons; returns the pack. */
export function loadMyIcons(file = myIconsFile()) {
  const pack = readMyIcons(file);
  if (pack.icons.length) registerPack(pack);
  return pack;
}

/**
 * Add an icon definition (from iconFromElements) to My icons, or replace one with the same id
 * when `replace` is true. Returns the registered id, e.g. "my/t-cell-cluster".
 */
export function saveMyIcon(def, { replace = false, file = myIconsFile() } = {}) {
  const pack = readMyIcons(file);
  const base = iconSlug(def.id || def.name);
  const id = replace ? base : uniqueIconId(pack, base);
  const icon = { ...def, id, svg: sanitizeSvg(String(def.svg || '')), own: true, credits: Array.isArray(def.credits) ? def.credits : [] };
  if (!icon.svg.trim()) throw new Error('The icon has no drawing');
  if (!(Number(icon.w) > 0 && Number(icon.h) > 0)) throw new Error('The icon needs a width and height');
  pack.icons = [...pack.icons.filter((i) => i.id !== id), icon];
  writeMyIcons(pack, file);
  registerPack({ ...pack, icons: [icon] });
  return `${MY_ICONS_PREFIX}/${id}`;
}

/** Remove a saved icon (figures that use it keep their own copy). */
export function removeMyIcon(fullId, { file = myIconsFile() } = {}) {
  const id = String(fullId).replace(new RegExp(`^${MY_ICONS_PREFIX}/`), '');
  const pack = readMyIcons(file);
  const before = pack.icons.length;
  pack.icons = pack.icons.filter((i) => i.id !== id);
  if (pack.icons.length === before) return false;
  writeMyIcons(pack, file);
  return true;
}

/** Rename a saved icon (keeps its id, so figures using it are unaffected). */
export function renameMyIcon(fullId, name, { file = myIconsFile() } = {}) {
  const id = String(fullId).replace(new RegExp(`^${MY_ICONS_PREFIX}/`), '');
  const pack = readMyIcons(file);
  const ic = pack.icons.find((i) => i.id === id);
  if (!ic) return false;
  ic.name = String(name).trim() || ic.name;
  writeMyIcons(pack, file);
  const reg = getIcon(`${MY_ICONS_PREFIX}/${id}`);
  if (reg) reg.name = ic.name;
  return true;
}
