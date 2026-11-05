// Attached elements (receptors on a cell, antibodies on a virion) keep their place on the host's
// surface when the host is resized or rotated. Their position is derived from where they sit now,
// so this also works for figures made before attachments were tracked, and after a person has slid
// a receptor along the membrane by hand.

import { getIcon } from '../icons/registry.js';
import { elementBox, center, surfacePoint, rotatePoint } from './geometry.js';
import { samplePath, pointAt, nearestOnPath } from './path.js';

/** The point where an attached element meets its host (the icon's membrane anchor), in canvas px. */
export function anchorPoint(el) {
  const def = el.type === 'icon' ? getIcon(el.icon) : null;
  const vw = def?.w ?? 100, vh = def?.h ?? 100;
  const [ax, ay] = def?.anchor ?? [vw / 2, vh];
  const off = rotatePoint({ x: (ax / vw - 0.5) * el.w, y: (ay / vh - 0.5) * el.h }, { x: 0, y: 0 }, el.rotation || 0);
  return { x: el.x + el.w / 2 + off.x, y: el.y + el.h / 2 + off.y };
}

function shift(doc, el, dx, dy, seen) {
  if (seen.has(el.id)) return;
  seen.add(el.id);
  if (el.type === 'arrow') return;
  el.x += dx;
  el.y += dy;
  for (const c of doc.elements) if (c.attachedTo === el.id) shift(doc, c, dx, dy, seen);
}

const geomKey = (e) => [e.x, e.y, e.w, e.h, e.rotation || 0, e.icon, e.shape, JSON.stringify(e.points || null)].join('|');

/**
 * `host` has changed from `before` (a copy taken just before the change). Move everything attached
 * to it so each item stays on the surface at the same direction from the center, at the same
 * distance in or out of the membrane, and turns with the host if it was rotated.
 * `skip` lists ids that were transformed together with the host and must not move again.
 * Returns the ids that moved.
 */
export function reseatAttached(doc, host, before, { skip = null } = {}) {
  if (!host || !before || host.type === 'arrow' || geomKey(host) === geomKey(before)) return [];
  const kids = doc.elements.filter((c) => c.attachedTo === host.id && c.type !== 'arrow' && !(skip && skip.has(c.id)));
  if (!kids.length) return [];
  if (host.type === 'path') return reseatOnPath(doc, host, before, kids);
  const c0 = center(elementBox(before, doc));
  const dRot = (host.rotation || 0) - (before.rotation || 0);
  const mid = { ...host, rotation: before.rotation || 0 };
  const c1 = center(elementBox(host, doc));
  const moved = [];
  const seen = new Set([host.id]);
  for (const k of kids) {
    const A = anchorPoint(k);
    const vx = A.x - c0.x, vy = A.y - c0.y;
    if (Math.hypot(vx, vy) < 1e-6) continue;
    const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
    const S0 = surfacePoint(before, ang, doc, 0);
    const inset = Math.hypot(S0.x - c0.x, S0.y - c0.y) - Math.hypot(vx, vy);
    let P = surfacePoint(mid, ang, doc, inset);
    if (dRot) {
      P = rotatePoint(P, c1, dRot);
      // turn the item about its own anchor, then carry it to the new point
      const ctr = { x: k.x + k.w / 2, y: k.y + k.h / 2 };
      const nc = rotatePoint(ctr, A, dRot);
      k.x = nc.x - k.w / 2;
      k.y = nc.y - k.h / 2;
      k.rotation = ((((k.rotation || 0) + dRot) % 360) + 360) % 360;
    }
    const A2 = anchorPoint(k);
    shift(doc, k, P.x - A2.x, P.y - A2.y, seen);
    moved.push(k.id);
  }
  return moved;
}

/** Path hosts: keep each item at the same fraction of the length and offset from the curve. */
function reseatOnPath(doc, host, before, kids) {
  const S0 = samplePath(before), S1 = samplePath(host);
  if (S0.length < 2 || S1.length < 2) return [];
  const moved = [];
  const seen = new Set([host.id]);
  for (const k of kids) {
    const A = anchorPoint(k);
    const hit = nearestOnPath(before, A, S0);
    const P0 = pointAt(before, hit.u, S0), P1 = pointAt(host, hit.u, S1);
    const dn = (A.x - P0.x) * P0.nx + (A.y - P0.y) * P0.ny;
    const dt = (A.x - P0.x) * P0.tx + (A.y - P0.y) * P0.ty;
    const dRot = ((Math.atan2(P1.ny, P1.nx) - Math.atan2(P0.ny, P0.nx)) * 180) / Math.PI;
    if (dRot) {
      const ctr = { x: k.x + k.w / 2, y: k.y + k.h / 2 };
      const nc = rotatePoint(ctr, A, dRot);
      k.x = nc.x - k.w / 2;
      k.y = nc.y - k.h / 2;
      k.rotation = ((((k.rotation || 0) + dRot) % 360) + 360) % 360;
    }
    const T = { x: P1.x + P1.nx * dn + P1.tx * dt, y: P1.y + P1.ny * dn + P1.ty * dt };
    const A2 = anchorPoint(k);
    shift(doc, k, T.x - A2.x, T.y - A2.y, seen);
    moved.push(k.id);
  }
  return moved;
}
