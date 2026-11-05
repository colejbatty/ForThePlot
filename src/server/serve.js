// `fortheplot serve figure.json` — a tiny local server that opens the editor on a
// figure file and keeps the two in sync both ways:
//   * edits in the browser are written to the file (debounced, atomic)
//   * changes to the file (an agent via MCP/CLI, a text editor, git) appear in the
//     browser immediately via Server-Sent Events
// It binds to 127.0.0.1 by default.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeFigure, createFigure, registerEmbeddedIcons, embedUsedIcons, embedUsedImages, applyOps, newId } from '../core/index.js';
import { ROOT } from '../node/root.js';

const MIME = { '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.md': 'text/markdown' };

export function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  try {
    fs.renameSync(tmp, file);
  } catch (err) {
    // Windows refuses to replace a file another process has open; write in place instead.
    fs.writeFileSync(file, text);
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

export async function serve({ file, port = 5173, host = '127.0.0.1', packs = path.join(ROOT, 'packs'), quiet = false } = {}) {
  const figPath = path.resolve(file || 'figure.json');
  if (!fs.existsSync(figPath)) {
    fs.mkdirSync(path.dirname(figPath), { recursive: true });
    writeAtomic(figPath, JSON.stringify(createFigure({ title: path.basename(figPath, '.json') }), null, 2) + '\n');
  }
  const distHtml = path.join(ROOT, 'dist', 'fortheplot.html');
  if (!fs.existsSync(distHtml)) throw new Error('dist/fortheplot.html is missing. Run `npm run build` first.');

  let last = fs.readFileSync(figPath, 'utf8');
  const clients = new Set();
  // What the person has selected in the editor, so an agent can act on "this".
  const state = { selection: { ids: [], at: 0 } };

  const broadcast = (text) => {
    const payload = `event: figure\ndata: ${text.replace(/\n/g, '\ndata: ')}\n\n`;
    for (const res of clients) res.write(payload);
  };
  const notice = (text, kind = 'info') => {
    const payload = `event: notice\ndata: ${JSON.stringify({ text, kind })}\n\n`;
    for (const res of clients) res.write(payload);
    if (!quiet) console.log(text);
  };
  const loadDoc = () => {
    const raw = JSON.parse(fs.readFileSync(figPath, 'utf8'));
    registerEmbeddedIcons(raw);
    return normalizeFigure(raw);
  };
  const saveDoc = (doc) => {
    const text = JSON.stringify(embedUsedImages(embedUsedIcons(doc)), null, 2) + '\n';
    last = text;
    writeAtomic(figPath, text);
    broadcast(text);
  };

  // ---- Linked graphs (Prism files and watched pictures) ----
  const links = await import('../node/links.js');
  const linkWatchers = new Map();
  let linkTimer = null, refreshing = false;
  const refreshChanged = async (opts = {}) => {
    if (refreshing) { clearTimeout(linkTimer); linkTimer = setTimeout(() => refreshChanged(opts), 1500); return; }
    refreshing = true;
    try {
      const doc = loadDoc();
      const pending = doc.elements.filter((e) => e.link && (!opts.ids || opts.ids.includes(e.id)));
      if (!pending.length) return;
      if (opts.force) notice('Updating linked graph…');
      const res = await links.refreshLinks(doc, figPath, opts);
      const done = res.filter((r) => r.ok);
      if (done.length) {
        saveDoc(doc);
        notice(`Updated ${done.map((r) => r.id).join(', ')} from ${done.length === 1 ? 'its source' : 'their sources'}`);
      }
      for (const r of res.filter((x) => !x.ok)) notice(`Couldn’t update ${r.id}: ${r.error}`, 'error');
    } catch (err) {
      notice(`Couldn’t update linked graphs: ${err.message}`, 'error');
    } finally {
      refreshing = false;
    }
  };
  const syncLinkWatchers = () => {
    let doc;
    try { doc = loadDoc(); } catch { return; }
    const want = new Map();
    for (const e of doc.elements) {
      if (!e.link) continue;
      const f = links.watchedFile(e.link, figPath);
      if (f) want.set(f, true);
    }
    for (const [f, w] of linkWatchers) if (!want.has(f)) { w.close(); linkWatchers.delete(f); }
    for (const f of want.keys()) {
      if (linkWatchers.has(f)) continue;
      try {
        const w = fs.watch(path.dirname(f), (evt, name) => {
          if (name && path.basename(String(name)) !== path.basename(f)) return;
          clearTimeout(linkTimer);
          linkTimer = setTimeout(() => refreshChanged(), 1500);
        });
        linkWatchers.set(f, w);
      } catch { /* folder gone */ }
    }
  };
  syncLinkWatchers();
  setTimeout(() => refreshChanged(), 500); // catch up on changes made while the editor was closed

  // Watch the directory (survives atomic renames by editors and agents).
  let timer = null;
  const watcher = fs.watch(path.dirname(figPath), (evt, name) => {
    if (name && path.basename(String(name)) !== path.basename(figPath)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      let text;
      try { text = fs.readFileSync(figPath, 'utf8'); } catch { return; }
      if (text === last) return;
      try { JSON.parse(text); } catch { return; } // half-written; wait for the next event
      last = text;
      broadcast(text);
      syncLinkWatchers();
      if (!quiet) console.log(`↻ ${path.basename(figPath)} changed on disk; pushed to the editor`);
    }, 60);
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const html = fs.readFileSync(distHtml, 'utf8').replace('<!--FORTHEPLOT_SERVER-->',
          `<script>window.FORTHEPLOT_SERVER=${JSON.stringify({ file: path.basename(figPath) }).replace(/</g, '\\u003c')}</script>`);
        res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
        return res.end(html);
      }
      if (url.pathname === '/api/figure' && req.method === 'GET') {
        res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
        return res.end(fs.readFileSync(figPath, 'utf8'));
      }
      if (url.pathname === '/api/figure' && req.method === 'PUT') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const text = Buffer.concat(chunks).toString('utf8');
        try { normalizeFigure(JSON.parse(text)); } catch (err) {
          res.writeHead(400, { 'content-type': 'text/plain' });
          return res.end(`Invalid figure: ${err.message}`);
        }
        last = text;
        writeAtomic(figPath, text);
        broadcast(text);
        syncLinkWatchers();
        res.writeHead(204);
        return res.end();
      }
      if (url.pathname.startsWith('/api/link') || url.pathname === '/api/open-link' || url.pathname === '/api/refresh-link' || url.pathname === '/api/prism-graphs') {
        if (req.method !== 'POST' || !/application\/json/.test(req.headers['content-type'] || '') || !sameOrigin(req)) {
          res.writeHead(403, { 'content-type': 'text/plain' });
          return res.end('Not allowed');
        }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const reply = (code, obj) => { res.writeHead(code, { 'content-type': MIME['.json'] }); res.end(JSON.stringify(obj)); };
        try {
          if (url.pathname === '/api/link') {
            const { el } = await links.linkedElement(body, figPath);
            for (const k of ['x', 'y', 'cx', 'cy', 'w']) if (Number.isFinite(Number(body[k])) && body[k] != null) el[k] = Number(body[k]);
            const doc = loadDoc();
            el.id = newId(doc, links.suggestId(el.link));
            const r = applyOps(doc, [{ op: 'add', element: el }]);
            if (r.error) return reply(400, { error: r.error });
            saveDoc(r.doc);
            syncLinkWatchers();
            return reply(200, { id: r.results[0].ids[0] });
          }
          if (url.pathname === '/api/prism-graphs') {
            const { prismContents } = await import('../node/prism.js');
            const abs = links.linkPath(String(body.file || ''), figPath);
            if (!abs || !fs.existsSync(abs)) return reply(404, { error: 'File not found' });
            return reply(200, (await prismContents(abs)) || { graphs: [], layouts: [] });
          }
          if (url.pathname === '/api/open-link') {
            const target = links.openLink(loadDoc(), String(body.id), figPath);
            return reply(200, { opened: path.basename(target) });
          }
          if (url.pathname === '/api/refresh-link') {
            await refreshChanged({ ids: body.id ? [String(body.id)] : null, force: true });
            return reply(200, { ok: true });
          }
        } catch (err) {
          return reply(400, { error: err.message });
        }
      }
      if (url.pathname === '/api/my-icons') {
        // "My icons": icons saved from figures, shared by every figure on this computer
        const mine = await import('../node/myicons.js');
        const reply = (code, obj) => { res.writeHead(code, { 'content-type': MIME['.json'], 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };
        if (req.method === 'GET') return reply(200, mine.readMyIcons());
        if (req.method !== 'POST' || !/application\/json/.test(req.headers['content-type'] || '') || !sameOrigin(req)) {
          res.writeHead(403, { 'content-type': 'text/plain' });
          return res.end('Not allowed');
        }
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        try {
          if (body.action === 'save') {
            if (!body.icon?.svg) return reply(400, { error: 'No icon to save' });
            const id = mine.saveMyIcon(body.icon, { replace: !!body.replace });
            return reply(200, { id, file: mine.myIconsFile(), pack: mine.readMyIcons() });
          }
          if (body.action === 'remove') return reply(200, { removed: mine.removeMyIcon(String(body.id)), pack: mine.readMyIcons() });
          if (body.action === 'rename') return reply(200, { renamed: mine.renameMyIcon(String(body.id), String(body.name || '')), pack: mine.readMyIcons() });
          return reply(400, { error: 'Unknown action' });
        } catch (err) {
          return reply(400, { error: err.message });
        }
      }
      if (url.pathname === '/api/capabilities') {
        const { findPrism } = await import('../node/prism.js');
        res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
        return res.end(JSON.stringify({ prism: !!findPrism(), platform: process.platform }));
      }
      if (url.pathname === '/api/selection' && req.method === 'POST') {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          state.selection = { ids: Array.isArray(body.ids) ? body.ids.map(String).slice(0, 500) : [], at: Date.now() };
        } catch { /* ignore malformed */ }
        res.writeHead(204);
        return res.end();
      }
      if (url.pathname === '/api/selection') {
        res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
        return res.end(JSON.stringify({ file: figPath, ...state.selection }));
      }
      if (url.pathname === '/api/export') {
        // server-side export (vector PDF, TIFF, PowerPoint) of the figure as saved
        const { exportFigure } = await import('../node/export.js');
        const raw = JSON.parse(fs.readFileSync(figPath, 'utf8'));
        registerEmbeddedIcons(raw);
        const q = url.searchParams;
        const r = await exportFigure(normalizeFigure(raw), {
          format: q.get('format') || 'pdf', journal: q.get('journal') || undefined, widthMm: q.get('widthMm') || undefined,
          dpi: q.get('dpi') || undefined, scale: q.get('scale') || undefined, notes: q.get('notes') === '1',
        });
        const name = `${path.basename(figPath, '.json')}.${r.ext === 'tiff' ? 'tif' : r.ext}`;
        res.writeHead(200, { 'content-type': r.mime, 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' });
        return res.end(r.data);
      }
      if (url.pathname === '/api/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        res.write(': connected\n\n');
        clients.add(res);
        const ping = setInterval(() => res.write(': ping\n\n'), 25000);
        req.on('close', () => { clients.delete(res); clearInterval(ping); });
        return;
      }
      if (url.pathname.startsWith('/packs/')) {
        const rel = decodeURIComponent(url.pathname.slice('/packs/'.length));
        const abs = path.resolve(packs, rel);
        if (!abs.startsWith(path.resolve(packs) + path.sep) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'content-type': MIME[path.extname(abs)] || 'application/octet-stream', 'cache-control': 'max-age=3600' });
        return fs.createReadStream(abs).pipe(res);
      }
      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(err?.message || err));
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const addr = server.address();
  // Requests that act on the computer must come from the editor page itself, not another site.
  function sameOrigin(req) {
    const o = req.headers.origin;
    if (!o) return true;
    try { const u = new URL(o); return (u.hostname === '127.0.0.1' || u.hostname === 'localhost') && Number(u.port) === addr.port; } catch { return false; }
  }
  const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${addr.port}/`;
  if (!quiet) {
    console.log(`ForThePlot editor: ${url}`);
    console.log(`Editing ${figPath}`);
    console.log('Agents can edit the same file (MCP server or `fortheplot apply`); changes appear live. Ctrl+C to stop.');
  }
  return {
    url, server, file: figPath, state,
    close: () => new Promise((r) => { watcher.close(); for (const w of linkWatchers.values()) w.close(); clearTimeout(linkTimer); for (const c of clients) c.end(); server.close(() => r()); }),
  };
}
