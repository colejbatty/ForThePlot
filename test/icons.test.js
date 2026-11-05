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
  }
});

test('icons recolor by role', () => {
  for (const id of ['hepatocyte', 'astrocyte', 'coronavirus', 'thermocycler']) {
    const ic = getIcon(id);
    const a = iconMarkup(ic, ic.colors, 'r'), b = iconMarkup(ic, { ...ic.colors, primary: '#123456' }, 'r');
    assert.notEqual(a, b, `${id} ignores its primary color`);
  }
});
