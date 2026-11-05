// "Add Prism graph": link a graph from a Prism file (or any picture file) so it can be reopened in
// Prism with a double-click and updates when the source changes. Needs the local server.

import { S, on, select } from './state.js';
import { h, button, toast } from './ui.js';
import { server, serverCall } from './io.js';
import { viewCenter } from './stage.js';

let dlg, fileIn, graphIn, graphSel, graphLabel, layoutIn, info, addBtn;
let listTimer = 0, listFor = '';

// List the graphs of a .prism file by name, so you can pick one instead of counting.
async function loadGraphs(v) {
  listFor = v;
  graphSel.hidden = true; graphIn.hidden = false;
  if (!/\.prism$/i.test(v)) return;
  try {
    const c = await serverCall('/api/prism-graphs', { file: v });
    if (listFor !== v) return;
    const items = [...c.graphs.map((g) => ['g', g]), ...c.layouts.map((g) => ['l', g])];
    if (!items.length) return;
    graphSel.innerHTML = '';
    for (const [k, g] of items) graphSel.append(h('option', { value: `${k}:${g.n}` }, `${k === 'l' ? 'Layout' : 'Graph'} ${g.n}: ${g.title || '(untitled)'}`));
    graphSel.hidden = false; graphIn.hidden = true; layoutIn.parentElement.hidden = true;
  } catch { /* fall back to the number field */ }
}

function refresh() {
  const v = fileIn.value.trim().replace(/^"(.*)"$/, '$1');
  const isPrism = /\.(prism|pzfx|pzf)$/i.test(v);
  graphIn.closest('.exp-row').hidden = !isPrism;
  graphLabel.hidden = !isPrism;
  if (v !== listFor) { layoutIn.parentElement.hidden = false; clearTimeout(listTimer); listTimer = setTimeout(() => loadGraphs(v), 250); }
  info.innerHTML = '';
  if (!v) info.append(h('p', { class: 'muted' }, 'Paste the full path of a Prism file, or of a picture you exported from Prism (SVG keeps it sharp). In Windows Explorer: Shift + right-click the file → Copy as path.'));
  else if (isPrism && server.prism) info.append(h('p', { class: 'ok' }, 'ForThePlot will ask Prism to export this graph, and again whenever you save the Prism file.'));
  else if (isPrism) info.append(h('p', { class: 'warn' }, server.platform === 'win32'
    ? 'Prism wasn’t found on this computer, so ForThePlot can’t export the graph itself. Export it from Prism as SVG and paste that file’s path instead.'
    : 'ForThePlot can export Prism graphs itself only on Windows. Export the graph from Prism as SVG and paste that file’s path instead; it updates whenever you export again.'));
  else info.append(h('p', { class: 'ok' }, 'ForThePlot will watch this picture and update the figure whenever you export it again from Prism.'));
  addBtn.disabled = !v;
}

async function add() {
  const file = fileIn.value.trim().replace(/^"(.*)"$/, '$1');
  addBtn.disabled = true;
  addBtn.querySelector('span').textContent = 'Adding…';
  try {
    const c = viewCenter();
    const pick = !graphSel.hidden && graphSel.value ? graphSel.value.split(':') : null;
    const graph = pick ? Number(pick[1]) : Number(graphIn.value) || 1;
    const layout = pick ? pick[0] === 'l' : layoutIn.checked;
    const r = await serverCall('/api/link', { file, graph, layout, cx: c.x, cy: c.y, w: 420 });
    dlg.close();
    toast('Added. Double-click it to open in Prism; your changes there show up here when you save.');
    if (S.doc.elements.some((e) => e.id === r.id)) select(r.id);
    else {
      const off = on('doc', () => { if (S.doc.elements.some((e) => e.id === r.id)) { off(); select(r.id); } });
      setTimeout(off, 5000);
    }
  } catch (err) {
    info.innerHTML = '';
    info.append(h('p', { class: 'warn' }, err.message));
  } finally {
    addBtn.disabled = false;
    addBtn.querySelector('span').textContent = 'Add graph';
  }
}

export function openLinkDialog() {
  if (!server.enabled) {
    toast('Linking Prism graphs needs the editor Claude opens on your computer (or `fortheplot serve`). Here, use File → Import image.', 'error');
    return;
  }
  if (!dlg) {
    fileIn = h('input', { type: 'text', id: 'link-file', placeholder: 'C:\\Users\\you\\Data\\cytokines.prism', spellcheck: 'false', style: { width: '100%' } });
    fileIn.addEventListener('input', refresh);
    fileIn.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && !addBtn.disabled) add(); });
    graphIn = h('input', { type: 'number', id: 'link-graph', min: 1, step: 1, value: 1 });
    graphSel = h('select', { id: 'link-graph-list', hidden: true });
    graphIn.addEventListener('keydown', (e) => e.stopPropagation());
    layoutIn = h('input', { type: 'checkbox', id: 'link-layout' });
    info = h('div', { class: 'exp-info' });
    addBtn = button('Add graph', { cls: 'primary', onClick: add });
    dlg = h('dialog', { id: 'link-dialog', class: 'dialog' },
      h('h2', {}, 'Add a Prism graph'),
      h('p', { class: 'muted' }, 'The graph stays linked to its Prism file: double-click it to edit in Prism.'),
      h('div', { class: 'exp-grid' },
        h('label', { for: 'link-file' }, 'File'), h('div', { class: 'exp-row' }, fileIn),
        (graphLabel = h('label', { for: 'link-graph' }, 'Graph')), h('div', { class: 'exp-row' }, graphSel, graphIn, h('label', { class: 'muted' }, layoutIn, ' it’s a layout'), h('span', { class: 'muted' }, 'or its number in Prism’s Graphs list, from the top')),
      ),
      info,
      h('div', { class: 'dialog-actions' }, h('span', { class: 'spacer' }), button('Cancel', { onClick: () => dlg.close() }), addBtn),
    );
    document.body.append(dlg);
  }
  refresh();
  dlg.showModal();
  fileIn.focus();
}
