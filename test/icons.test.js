import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allIcons, iconMarkup, getIcon } from '../src/icons/registry.js';
import '../src/icons/library/index.js';
import { ICON_GROUPS, groupOf } from '../src/icons/library/groups.js';

const builtin = allIcons().filter((i) => i.draw);

test('the built-in library covers human cell types and biology broadly', () => {
  assert.ok(builtin.length >= 550, `only ${builtin.length} icons`);
  const cellCats = ICON_GROUPS.find(([g]) => g === 'Cells')[1];
  const cells = builtin.filter((i) => cellCats.includes(i.category));
  assert.ok(cells.length >= 180, `only ${cells.length} cell types`);
  for (const id of ['hepatocyte', 'cardiomyocyte', 'podocyte', 'pyramidal-neuron', 'beta-cell', 'oocyte', 'osteoclast', 'goblet-cell', 'rod-cell', 'langerhans-cell'])
    assert.ok(getIcon(id), `missing ${id}`);
});

test('every built-in icon belongs to a known group', () => {
  const known = new Set(ICON_GROUPS.flatMap(([, cats]) => cats));
  for (const ic of builtin) {
    assert.ok(known.has(ic.category), `${ic.id}: category "${ic.category}" is not in groups.js`);
    assert.equal(ic.group, groupOf(ic.category));
  }
});

test('built-in icons are deterministic, prefixed and self-contained', () => {
  for (const ic of builtin) {
    const a = iconMarkup(ic, ic.colors, 'q7'), b = iconMarkup(ic, ic.colors, 'q7');
    assert.equal(a, b, `${ic.id} is not deterministic`);
    assert.ok(!/NaN|undefined|Infinity/.test(a), `${ic.id} has NaN/undefined`);
    const ids = [...a.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${ic.id} has duplicate ids`);
    for (const x of ids) assert.ok(x.startsWith('q7'), `${ic.id}: id "${x}" is not prefixed with the uid`);
    for (const m of a.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(m[1]), `${ic.id}: url(#${m[1]}) has no definition`);
    for (const m of a.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), `${ic.id}: href="#${m[1]}" has no definition`);
  }
});

test('icons recolor by role', () => {
  for (const id of ['hepatocyte', 'astrocyte', 'coronavirus', 'thermocycler']) {
    const ic = getIcon(id);
    const a = iconMarkup(ic, ic.colors, 'r'), b = iconMarkup(ic, { ...ic.colors, primary: '#123456' }, 'r');
    assert.notEqual(a, b, `${id} ignores its primary color`);
  }
});

// ---- markup structure ---------------------------------------------------------------------

/** Walk an icon's markup tag by tag. Returns { error } or { tags: [{ name, attrs, open, close, depth, index }] }. */
function scan(markup) {
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>/g;
  const tags = [], stack = [];
  let last = 0, m;
  while ((m = re.exec(markup))) {
    if (/[<>]/.test(markup.slice(last, m.index))) return { error: `stray markup before offset ${m.index}` };
    last = re.lastIndex;
    const [, closing, name, attrs, selfClosing] = m;
    if (closing) {
      if (stack.pop() !== name) return { error: `</${name}> does not match its opening tag` };
      tags.push({ name, close: true, depth: stack.length, index: m.index });
    } else {
      tags.push({ name, attrs, open: !selfClosing, depth: stack.length, index: m.index });
      if (!selfClosing) stack.push(name);
    }
  }
  if (/[<>]/.test(markup.slice(last))) return { error: 'stray markup at the end' };
  if (stack.length) return { error: `<${stack.pop()}> is never closed` };
  return { tags };
}

test('built-in icons are well-formed markup', () => {
  for (const ic of builtin) {
    const r = scan(iconMarkup(ic, ic.colors, 'w1'));
    assert.ok(!r.error, `${ic.id}: ${r.error}`);
  }
});

// ---- cell contents stay inside the membrane -------------------------------------------------

/** The points of a smooth() outline (M … C … Z), with two extra samples on every curve. */
function outlinePoints(d) {
  if (/[^MCZ\d\s.\-e]/i.test(d)) return null; // arcs, lines: not an outline built by smooth()
  const v = d.match(/-?\d*\.?\d+(?:e-?\d+)?/g).map(Number);
  const pts = [[v[0], v[1]]];
  for (let i = 2; i + 5 < v.length; i += 6) {
    const [x0, y0] = pts[pts.length - 1], [x1, y1, x2, y2, x3, y3] = v.slice(i, i + 6);
    for (const t of [1 / 3, 2 / 3, 1]) {
      const u = 1 - t;
      pts.push([u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3]);
    }
  }
  return pts;
}
function isInside(p, x, y) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function edgeDistance(p, x, y) {
  let m = Infinity;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [ax, ay] = p[j], [bx, by] = p[i];
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
    m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return m;
}

// Drawn across the membrane on purpose (secretion, budding).
const CROSSES_MEMBRANE = new Set(['mammary-luminal-cell']);

/**
 * Cells built on a shared outline (shape() keys "o" and "bdy") draw their organelles between the
 * body fill and the membrane. Anything placed there by hand must sit inside the outline: this
 * catches coordinates left behind when an outline is redrawn.
 */
test('organelles sit inside the cell outline', () => {
  let checked = 0;
  const problems = [];
  for (const ic of builtin) {
    if (CROSSES_MEMBRANE.has(ic.id)) continue;
    const markup = iconMarkup(ic, ic.colors, 'k');
    const def = markup.match(/<path id="(k-(?:o|bdy))" d="([^"]+)"\/>/);
    if (!def) continue;
    const outline = outlinePoints(def[2]);
    const from = markup.indexOf(`<use xlink:href="#${def[1]}" fill="url(`);
    const to = markup.indexOf(`<use xlink:href="#${def[1]}" fill="none" stroke=`, from);
    if (!outline || from < 0 || to < 0) continue;
    const { tags } = scan(markup);
    checked++;
    let skipBelow = Infinity; // inside a clipped or transformed group: its own coordinates, or clipped anyway
    for (const t of tags) {
      if (t.index <= from || t.index >= to) continue;
      if (t.close) { if (t.depth < skipBelow) skipBelow = Infinity; continue; }
      if (t.depth >= skipBelow) continue;
      const at = (k) => Number((t.attrs.match(new RegExp(`\\s${k}="([-\\d.]+)"`)) || [])[1]);
      if (t.name === 'g' && t.open && /clip-path=|transform=/.test(t.attrs)) {
        skipBelow = t.depth + 1;
        const tr = t.attrs.match(/transform="translate\(([-\d.]+) ([-\d.]+)\)/);
        if (tr) { // a mitochondrion, Golgi stack… placed at this point
          const [x, y] = [Number(tr[1]), Number(tr[2])];
          if (!(isInside(outline, x, y) && edgeDistance(outline, x, y) >= 1.2)) problems.push(`${ic.id}: organelle at (${x}, ${y}) is outside the cell or on its membrane`);
        }
      } else if (t.name === 'circle' && !/transform=/.test(t.attrs)) {
        const x = at('cx'), y = at('cy'), r = at('r');
        if (r < 1.2) continue; // fine texture
        if (!(isInside(outline, x, y) && edgeDistance(outline, x, y) >= r * 0.75)) problems.push(`${ic.id}: circle at (${x}, ${y}) r ${r} crosses the cell outline`);
      }
    }
  }
  assert.ok(checked >= 100, `only ${checked} cells were checked`);
  assert.deepEqual(problems, []);
});
