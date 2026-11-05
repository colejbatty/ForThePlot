// GraphPad Prism round trip: export a graph from a Prism file with Prism's own scripting, and
// open files in their usual program. Prism can run a script from the command line on Windows
// (PRISM.EXE @"script.pzc"); it runs out of sight and we wait for a "done" file the script writes.
// On other systems (or without Prism) a figure can instead link to a picture exported from Prism.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const PRISM_FILE = /\.(prism|pzfx|pzf)$/i;

/** Where Prism is installed (Windows), or null. FORTHEPLOT_PRISM overrides. */
export function findPrism() {
  const env = process.env.FORTHEPLOT_PRISM;
  if (env && !env.includes('${') && fs.existsSync(env)) return env;
  if (process.platform !== 'win32') return null;
  const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files', 'C:\\Program Files (x86)'].filter(Boolean);
  const found = [];
  for (const r of [...new Set(roots)]) {
    const gp = path.join(r, 'GraphPad');
    let dirs = [];
    try { dirs = fs.readdirSync(gp); } catch { continue; }
    for (const d of dirs) {
      if (!/^prism/i.test(d)) continue;
      const exe = path.join(gp, d, 'prism.exe');
      if (fs.existsSync(exe)) found.push({ exe, v: Number((d.match(/(\d+)/) || [0, 0])[1]) });
    }
  }
  found.sort((a, b) => b.v - a.v);
  return found[0]?.exe || null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The graphs and layouts of a .prism file in Prism's own order (the Navigator list), with their
 * names and ids: { graphs: [{ n, uid, title }], layouts: [...] }. Null for other formats.
 */
export async function prismContents(file) {
  if (!/\.prism$/i.test(file)) return null;
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(fs.readFileSync(file));
    const docFile = zip.file('document.json');
    const doc = docFile ? JSON.parse(await docFile.async('string')) : null;
    if (doc?.sheets?.graphs || doc?.sheets?.layouts) {
      const list = async (kind) => Promise.all((doc.sheets?.[kind] || []).map(async (uid, i) => {
        let title = '';
        try { title = JSON.parse(await zip.file(`${kind}/${uid}/sheet.json`).async('string')).title || ''; } catch { /* untitled */ }
        return { n: i + 1, uid, title };
      }));
      return { graphs: await list('graphs'), layouts: await list('layouts') };
    }
    const ids = (kind) => [...new Set(Object.keys(zip.files).map((p) => (new RegExp(`^${kind}/([^/]+)/`).exec(p) || [])[1]).filter(Boolean))].map((uid, i) => ({ n: i + 1, uid, title: '' }));
    return { graphs: ids('graphs'), layouts: ids('layouts') };
  } catch { return null; }
}

/**
 * Work out which graph is meant: by id (survives reordering in Prism), by name ("H1 Redone",
 * exact or a unique part of it), or by number. Returns { index, uid?, title? }.
 */
export async function resolveGraph(file, { graph = 1, layout = false, uid = null } = {}) {
  const contents = await prismContents(file);
  const kind = layout ? 'layout' : 'graph';
  const asNumber = typeof graph === 'number' || /^\s*\d+\s*$/.test(String(graph));
  if (!contents) {
    if (!asNumber) throw new Error(`Give the ${kind} number for ${path.extname(file)} files (names can be read only from .prism files).`);
    return { index: Math.max(1, Math.round(Number(graph))) };
  }
  const list = layout ? contents.layouts : contents.graphs;
  if (!list.length) throw new Error(`${path.basename(file)} has no ${kind}s.`);
  let hit = uid ? list.find((g) => g.uid === uid) : null;
  if (!hit && !asNumber) {
    const q = String(graph).trim().toLowerCase();
    const exact = list.filter((g) => g.title.toLowerCase() === q);
    if (exact.length > 1) throw new Error(`${exact.length} ${kind}s are named "${graph}" (numbers ${exact.map((g) => g.n).join(', ')}). Use the number.`);
    [hit] = exact;
    if (!hit) {
      const part = list.filter((g) => g.title.toLowerCase().includes(q));
      if (part.length === 1) [hit] = part;
      else if (part.length > 1) throw new Error(`Several ${kind}s match "${graph}": ${part.map((g) => `${g.n}. ${g.title}`).join('; ')}. Use the number or the full name.`);
      else throw new Error(`No ${kind} named "${graph}" in ${path.basename(file)}. Its ${kind}s: ${list.map((g) => `${g.n}. ${g.title}`).join('; ')}`);
    }
  }
  if (!hit) {
    const n = Math.max(1, Math.round(Number(graph) || 1));
    if (n > list.length) throw new Error(`${path.basename(file)} has ${list.length} ${kind}${list.length === 1 ? '' : 's'}; there is no number ${n}.`);
    hit = list[n - 1];
  }
  return { index: hit.n, uid: hit.uid, title: hit.title };
}

/**
 * Export graph (or layout) number `index` of a Prism file to `out` (.svg, .png or .tif) using
 * Prism itself. Works on a private copy of the file, so it never touches the one you have open.
 */
export async function exportPrismGraph({ file, index = 1, layout = false, out, prism = findPrism(), timeoutMs = Number(process.env.FORTHEPLOT_PRISM_TIMEOUT) || 90000 }) {
  if (!prism) throw new Error('GraphPad Prism was not found on this computer (looked in Program Files\\GraphPad). Set FORTHEPLOT_PRISM to prism.exe, or export the graph from Prism yourself and link the picture instead.');
  if (!fs.existsSync(file)) throw new Error(`Prism file not found: ${file}`);
  const contents = await prismContents(file);
  const count = contents && (layout ? contents.layouts : contents.graphs).length;
  if (count && index > count) throw new Error(`${path.basename(file)} has ${count} ${layout ? 'layout' : 'graph'}${count === 1 ? '' : 's'}; there is no number ${index}.`);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'fortheplot-prism-'));
  try {
    const src = path.join(work, `source${path.extname(file).toLowerCase()}`);
    fs.copyFileSync(file, src);
    const ext = path.extname(out).toLowerCase();
    const tmpOut = path.join(work, `graph${ext}`);
    const done = path.join(work, 'done.txt');
    const exportLine = ext === '.svg' ? `ExportSVG "${tmpOut}" CLEAR`
      : ext === '.png' ? `ExportPNG "${tmpOut}" 600 CLEAR`
        : `ExportTIF "${tmpOut}" 600 RGBhi CLEAR`;
    const script = [
      `Open "${src}"`,
      `GoTo ${layout ? 'L' : 'G'}, ${Math.max(1, Math.round(index))}`,
      exportLine,
      'Close',
      `OpenOutput "${done}"`,
      'WText done',
      'CloseOutput',
      '',
    ].join('\r\n');
    const scriptFile = path.join(work, 'export.pzc');
    fs.writeFileSync(scriptFile, script, 'latin1');
    // the documented form: "C:\…\prism.exe" @"C:\…\script.pzc"
    const child = process.platform === 'win32'
      ? spawn(prism, [`@"${scriptFile}"`], { argv0: `"${prism}"`, windowsVerbatimArguments: true, windowsHide: true, stdio: 'ignore' })
      : spawn(prism, [`@${scriptFile}`], { stdio: 'ignore' });
    child.on('error', () => {});
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      await wait(400);
      if (fs.existsSync(done) && fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
        await wait(150);
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.copyFileSync(tmpOut, out);
        return out;
      }
    }
    killTree(child);
    throw new Error(`Prism did not export ${layout ? 'layout' : 'graph'} ${index} of ${path.basename(file)} within ${Math.round(timeoutMs / 1000)} s. Check that it exists, or export it from Prism as SVG and link that picture instead.`);
  } finally {
    setTimeout(() => { try { fs.rmSync(work, { recursive: true, force: true }); } catch { /* ignore */ } }, 2000);
  }
}

function killTree(child) {
  try {
    if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }).on('error', () => {});
    else child.kill();
  } catch { /* ignore */ }
}

/** Open a file in its usual program (Prism for .prism files). */
export function openWithDefaultApp(file) {
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  const cmd = process.env.FORTHEPLOT_OPEN_CMD
    || (process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open');
  const child = spawn(cmd, [file], { detached: true, stdio: 'ignore', windowsHide: false });
  child.on('error', () => {});
  child.unref();
}
