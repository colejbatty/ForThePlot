// Linked graphs: an image element that remembers where its picture comes from, so it can be
// reopened in Prism and refreshed when the source changes.
//
//   "link": { "prism": "C:\\data\\cytokines.prism", "graph": 2 }        ForThePlot exports graph 2 with Prism
//   "link": { "picture": "C:\\data\\cytokines-graph2.svg", "prism": … }  you export; ForThePlot watches the picture
// Relative paths are relative to the figure file. `updated` and `mtime` record the last refresh.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findElement, registerImage, getImage } from '../core/index.js';
import { loadImageFile, IMAGE_EXT } from './images.js';
import { exportPrismGraph, findPrism, PRISM_FILE, openWithDefaultApp, resolveGraph } from './prism.js';
import { expandPath } from './root.js';

export function linkPath(p, figFile) {
  if (!p) return null;
  const q = expandPath(String(p).trim().replace(/^"(.*)"$/, '$1'));
  return path.isAbsolute(q) ? q : path.resolve(path.dirname(figFile), q);
}

/** The file whose changes should refresh this link. */
export function watchedFile(link, figFile) {
  if (link.picture) return linkPath(link.picture, figFile);
  if (link.prism) return linkPath(link.prism, figFile);
  return null;
}

/** Build a link from a path the person or agent gave: a Prism file or a picture. */
/** Store paths next to (or below) the figure relative to it, so the folder can move as a whole. */
function storePath(abs, figFile) {
  const rel = path.relative(path.dirname(figFile), abs);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : abs;
}

export async function makeLink({ file, graph, layout, picture }, figFile) {
  const abs = linkPath(file, figFile);
  if (!abs || !fs.existsSync(abs)) throw new Error(`File not found: ${file}`);
  if (PRISM_FILE.test(abs)) {
    // remember the graph's id and name too, so the link survives graphs being reordered in Prism
    const g = await resolveGraph(abs, { graph: graph ?? 1, layout: !!layout });
    const link = { prism: storePath(abs, figFile), graph: g.index };
    if (g.uid) link.uid = g.uid;
    if (g.title) link.title = g.title;
    if (layout) link.layout = true;
    if (picture) {
      const pic = linkPath(picture, figFile);
      if (!fs.existsSync(pic)) throw new Error(`Picture not found: ${picture}`);
      link.picture = storePath(pic, figFile);
    }
    return link;
  }
  if (IMAGE_EXT.test(abs)) return { picture: storePath(abs, figFile) };
  throw new Error(`"${path.basename(abs)}" is neither a Prism file (.prism, .pzfx, .pzf) nor a picture (SVG, PNG, JPEG, TIFF)`);
}

/** Get the current picture for a link: from its watched picture, or exported from Prism. */
export async function fetchLinkPicture(link, figFile) {
  if (link.picture) return loadImageFile(linkPath(link.picture, figFile));
  const file = linkPath(link.prism, figFile);
  const prism = findPrism();
  if (!prism) {
    throw new Error(process.platform === 'win32'
      ? 'GraphPad Prism was not found, so ForThePlot cannot export the graph itself. Export it from Prism as SVG (File > Export) and link that picture instead.'
      : 'ForThePlot can export Prism graphs by itself only on Windows. Export the graph from Prism as SVG (File > Export) and link that picture; it will update whenever you export again.');
  }
  const out = path.join(os.tmpdir(), `fortheplot-link-${process.pid}-${Date.now()}.svg`);
  try {
    // find the graph again by its id: it may have moved in Prism's list since it was linked
    let index = link.graph || 1;
    if (link.uid) {
      const g = await resolveGraph(file, { uid: link.uid, graph: link.title || index, layout: !!link.layout });
      index = g.index;
      link.graph = g.index;
      if (g.title) link.title = g.title;
    }
    await exportPrismGraph({ file, index, layout: !!link.layout, out, prism });
    const img = await loadImageFile(out);
    return { ...img, name: `${path.basename(file)} · ${link.title || `${link.layout ? 'layout' : 'graph'} ${index}`}` };
  } finally {
    try { fs.unlinkSync(out); } catch { /* ignore */ }
  }
}

/** Put a fresh picture into a linked element, keeping its width (and crop) on the canvas. */
export function applyPicture(el, img, link, figFile) {
  const id = registerImage({ src: img.src, w: img.w, h: img.h, name: img.name });
  const pic = getImage(id);
  const c = el.crop || { w: 1, h: 1 };
  const aspect = (pic.h * c.h) / (pic.w * c.w);
  if (el.image) el.h = el.w * aspect;
  el.image = id;
  const wf = watchedFile(link, figFile);
  let mtime = null;
  try { mtime = fs.statSync(wf).mtimeMs; } catch { /* ignore */ }
  el.link = { ...link, updated: new Date().toISOString(), ...(mtime ? { mtime } : {}) };
  return el;
}

/** Create a linked image element spec (not yet added). */
export async function linkedElement(opts, figFile) {
  const link = await makeLink(opts, figFile);
  const img = await fetchLinkPicture(link, figFile);
  const el = { type: 'image', src: img.src, name: img.name };
  const wf = watchedFile(link, figFile);
  el.link = { ...link, updated: new Date().toISOString(), mtime: fs.statSync(wf).mtimeMs };
  return { el, img };
}

/** Refresh linked elements of a figure. Returns [{id, ok, error?}] for those it tried. */
export async function refreshLinks(doc, figFile, { ids = null, force = false } = {}) {
  const out = [];
  for (const el of doc.elements) {
    if (el.type !== 'image' || !el.link || (ids && !ids.includes(el.id))) continue;
    const wf = watchedFile(el.link, figFile);
    let m = null;
    try { m = fs.statSync(wf).mtimeMs; } catch { out.push({ id: el.id, ok: false, error: `Linked file is missing: ${wf}` }); continue; }
    if (!force && el.link.mtime && m <= el.link.mtime) continue;
    try {
      const img = await fetchLinkPicture(el.link, figFile);
      applyPicture(el, img, el.link, figFile);
      out.push({ id: el.id, ok: true });
    } catch (err) {
      out.push({ id: el.id, ok: false, error: err.message });
    }
  }
  return out;
}

/** Open a linked element's source (the Prism file, else the picture) in its usual program. */
export function openLink(doc, id, figFile) {
  const el = findElement(doc, id);
  if (!el?.link) throw new Error(`"${id}" is not a linked graph`);
  const target = el.link.prism ? linkPath(el.link.prism, figFile) : linkPath(el.link.picture, figFile);
  if (!(PRISM_FILE.test(target) || IMAGE_EXT.test(target))) throw new Error('Only Prism files and pictures can be opened');
  openWithDefaultApp(target);
  return target;
}

/** Describe a link in one line. */
export function linkSummary(link) {
  const parts = [];
  if (link.prism) parts.push(`${path.basename(link.prism)} ${link.layout ? 'layout' : 'graph'} ${link.graph || 1}${link.title ? ` "${link.title}"` : ''}`);
  if (link.picture) parts.push(`picture ${path.basename(link.picture)}`);
  return parts.join(', via ');
}

/** A readable id for a linked graph, e.g. "cytokines-graph-2". */
export function suggestId(link) {
  const src = link.prism || link.picture || 'graph';
  const base = path.basename(String(src)).replace(/\.[^.]+$/, '');
  if (link.prism && link.title) return link.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || base;
  return link.prism ? `${base}-${link.layout ? 'layout' : 'graph'}-${link.graph || 1}` : base;
}
