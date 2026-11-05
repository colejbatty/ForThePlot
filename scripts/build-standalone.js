// Bundle the editor into a single self-contained HTML file.
//   dist/fortheplot.html           full document (open locally, or served by `fortheplot serve`)
//   dist/fortheplot.artifact.html  same page without the html/head/body wrapper (for hosts that add their own)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const result = await esbuild.build({
  entryPoints: [path.join(root, 'src/editor/entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  write: false,
  legalComments: 'none',
  define: { __FORTHEPLOT_VERSION__: JSON.stringify(pkg.version) },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(root, 'src/editor/styles.css'), 'utf8');

const head = [
  '<title>ForThePlot</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<meta name="description" content="ForThePlot: open-source scientific illustration for people and AI agents.">',
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">',
  `<style>${css}</style>`,
].join('\n');
const body = [
  '<div id="app">',
  '<header id="topbar"></header>',
  '<aside id="library" aria-label="Icon library"></aside>',
  '<main id="stage-wrap"><div id="tools" role="toolbar" aria-label="Drawing tools"></div></main>',
  '<aside id="inspector" aria-label="Properties"></aside>',
  '</div>',
  '<div id="toast" role="status" aria-live="polite" hidden></div>',
  '<!--FORTHEPLOT_SERVER-->',
  `<script>${js}</script>`,
].join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const full = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
fs.writeFileSync(path.join(root, 'dist/fortheplot.html'), full);
fs.writeFileSync(path.join(root, 'dist/fortheplot.artifact.html'), `${head}\n${body}\n`);
console.log(`dist/fortheplot.html  ${(full.length / 1024).toFixed(0)} KB`);
