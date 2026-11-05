// Where a building block lands. Blocks are laid out around the canvas center; when the figure already
// has content there and the caller gave no position, the block goes below the existing content
// (growing the canvas) so nothing is covered. Returns the ops to apply, as one transaction.

import { applyOps } from './ops.js';
import { contentBounds } from './render.js';
import { visualBounds, union } from './geometry.js';

const POSITION_KEYS = ['x', 'y', 'cx', 'cy'];

export function blockOps(doc, op, { gap = 40 } = {}) {
  if (op.op === 'tidy' || op.op === 'panels' || POSITION_KEYS.some((k) => op[k] != null)) return [op];
  if (!doc.elements.some((e) => !e.hidden && e.type !== 'note')) return [op];
  const trial = applyOps(doc, [op]);
  if (trial.error) return [op];
  const ids = new Set(trial.results.flatMap((x) => x.ids || []));
  const made = trial.doc.elements.filter((e) => ids.has(e.id) && !e.hidden);
  if (!made.length) return [op];
  const before = contentBounds(doc);
  const nb = union(made.map((e) => visualBounds(e, trial.doc)));
  const clear = nb.x >= before.x + before.w || nb.x + nb.w <= before.x || nb.y >= before.y + before.h || nb.y + nb.h <= before.y;
  if (clear) return [op];
  const dx = Math.max(20, (doc.canvas.width - nb.w) / 2) - nb.x;
  const dy = before.y + before.h + gap - nb.y;
  const ops = [op, { op: 'move', ids: [...ids], dx: Math.round(dx), dy: Math.round(dy) }];
  const needH = Math.ceil(before.y + before.h + gap + nb.h + gap);
  if (needH > doc.canvas.height) ops.push({ op: 'canvas', height: needH });
  return ops;
}
