// Organs and tissues, model organisms, lab equipment, data charts and symbols.

import { defs, sphere, linear, path, circle, ellipse, rect, line, dark, light, shade, n, ring, blob, smooth, smoothOpen, gloss, speckle, rng, rim, membrane, granules, vesicle, nucleusDetail, helix } from './kit.js';

const R3 = { primary: 'Main', secondary: 'Secondary', accent: 'Accent' };
function icon(category, id, name, tags, colors, draw, extra = {}) {
  return { id, name, category, tags, colors, roles: R3, draw, size: 100, ...extra };
}
const an = (...a) => icon('Organs & tissues', ...a);
const or = (...a) => icon('Organisms', ...a);
const lb = (...a) => icon('Lab equipment', ...a);
const ch = (...a) => icon('Charts & symbols', ...a);

/** An organ outline with body shading: gradient fill, inner rim shadow, outline and a soft sheen. */
export function organ(u, key, d, c, { r = 85, hi = 0.4, op = 0.3, from = 0.6, sw = 2 } = {}) {
  const g = sphere(u, key, c, { r, hi });
  return defs(g) + path(d, g.url) + rim(u, `${key}r`, d, c, { op, from }) + `<path d="${d}" fill="none" stroke="${dark(c, 0.42)}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}
export const tube = (d, c, w, { hi = true } = {}) => `<path d="${d}" fill="none" stroke="${dark(c, 0.42)}" stroke-width="${w + 2.4}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  + (hi ? `<path d="${d}" fill="none" stroke="${light(c, 0.45)}" stroke-width="${n(w * 0.28)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.75" transform="translate(-${n(w * 0.15)} -${n(w * 0.18)})"/>` : '');

export const anatomy = [
  an('lymph-node', 'Lymph node', ['lymph node', 'secondary lymphoid', 'germinal center', 'follicle', 'draining lymph node', 'dln'], { primary: '#f2b8c6', secondary: '#c95f86', accent: '#f6e2a8' },
    (c, u) => {
      // afferent lymphatics around the capsule, efferent vessel and blood vessels at the hilum
      let s = tube('M2 24 Q14 26 20 32', light(c.secondary, 0.3), 3) + tube('M2 60 Q12 56 18 52', light(c.secondary, 0.3), 3) + tube('M54 4 Q50 8 50 12', light(c.secondary, 0.3), 3);
      s += tube('M78 40 Q90 42 100 48', '#e85d5d', 3.2) + tube('M80 46 Q90 50 98 58', '#4a8fe7', 3);
      const d = smooth([[18, 20], [50, 6], [80, 16], [88, 40], [78, 50], [84, 66], [56, 78], [22, 70], [10, 46]]);
      s += organ(u, 'b', d, c.primary);
      // cortex follicles with germinal centers, paracortex, medullary cords
      s += path(blob(54, 42, 16, 12, { n: 7, wobble: 0.15, seed: 2 }), c.secondary, 'none', 0, ' opacity="0.35"');
      s += `<path d="M58 40 q8 2 14 4 M56 46 q8 4 12 10 M52 46 q-2 8 0 14" fill="none" stroke="${dark(c.secondary, 0.2)}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>`;
      [[30, 22], [48, 16], [66, 22], [22, 46], [32, 64], [52, 68], [70, 60]].forEach(([x, y], i) => {
        const fg = sphere(u, `f${i}`, c.accent, { hi: 0.45 });
        s += defs(fg) + circle(x, y, 7.5, fg.url, shade(c.accent, -0.35), 1.2) + circle(x + 0.6, y + 0.6, 3.6, light(c.accent, 0.5), shade(c.accent, -0.15), 0.6);
      });
      return s + gloss(32, 16, 12, 4, 0.5, -15);
    }, { w: 100, h: 80, roles: { primary: 'Node', secondary: 'Medulla', accent: 'Follicles' } }),
  an('thymus', 'Thymus', ['thymus', 'primary lymphoid', 't cell development', 'thymocyte', 'selection'], { primary: '#f0a8a0', secondary: '#c4645a', accent: '#f0a8a0' },
    (c, u) => {
      const left = smooth([[46, 10], [40, 30], [22, 46], [14, 72], [24, 92], [44, 88], [50, 60]]), right = smooth([[54, 10], [60, 30], [78, 46], [86, 72], [76, 92], [56, 88], [50, 60]]);
      let s = organ(u, 'l', left, c.primary) + organ(u, 'r', right, c.primary);
      // lobules: darker cortex, paler medulla
      [[34, 54, 8], [26, 74, 8], [40, 76, 7], [64, 56, 8], [74, 74, 8], [60, 78, 7], [44, 34, 6], [56, 34, 6]].forEach(([x, y, r], i) => {
        s += path(blob(x, y, r, r * 0.85, { n: 7, wobble: 0.15, seed: i + 1 }), dark(c.primary, 0.12), dark(c.secondary, 0.1), 0.8, ' opacity="0.7"') + circle(x, y, r * 0.42, light(c.primary, 0.4), 'none', 0, ' opacity="0.8"');
      });
      return s + gloss(34, 26, 6, 10, 0.4, 20) + gloss(64, 28, 6, 10, 0.35, -20);
    }),
  an('spleen', 'Spleen', ['spleen', 'secondary lymphoid', 'red pulp', 'white pulp', 'marginal zone'], { primary: '#9c3b5c', secondary: '#f6d2df', accent: '#9c3b5c' },
    (c, u) => {
      const d = smooth([[8, 40], [26, 14], [60, 6], [92, 18], [88, 34], [70, 30], [54, 44], [40, 62], [18, 62]]);
      let s = organ(u, 'b', d, c.primary, { hi: 0.35 });
      // white pulp around central arterioles
      [[30, 30], [46, 22], [62, 18], [78, 22], [36, 46], [24, 44]].forEach(([x, y], i) => { s += circle(x, y, 4.6, c.secondary, 'none', 0, ' opacity="0.75"') + circle(x, y, 1.2, '#e85d5d'); });
      s += tube('M50 44 Q56 50 54 58', '#e85d5d', 2.4) + tube('M46 46 Q50 54 46 62', '#4a8fe7', 2.2);
      return s + gloss(40, 14, 14, 3.4, 0.45, -12);
    }, { w: 100, h: 70 }),
  an('bone-marrow', 'Bone marrow', ['bone marrow', 'bone', 'femur', 'hematopoiesis', 'niche', 'primary lymphoid'], { primary: '#f4ead2', secondary: '#d9534f', accent: '#c9b48a' },
    (c, u) => {
      const d = 'M14 10 a10 10 0 0 1 14 10 L28 24 L92 24 L92 20 a10 10 0 1 1 14 12 a10 10 0 1 1 -14 12 L92 40 L28 40 L28 44 a10 10 0 1 1 -14 -12 a10 10 0 1 1 0 -22 Z';
      const g = sphere(u, 'b', c.primary, { cx: 40, cy: 20, r: 90, hi: 0.3, lo: -0.12 });
      let s = defs(g) + path(d, g.url, dark(c.accent, 0.25), 2);
      // spongy trabecular bone at the ends
      s += speckle(17, 21, 7, 8, 10, 1.4, dark(c.accent, 0.1), 3, 0.6) + speckle(103, 33, 7, 8, 10, 1.4, dark(c.accent, 0.1), 5, 0.6);
      // marrow cavity packed with cells
      const mg = sphere(u, 'm', c.secondary, { hi: 0.3 });
      s += defs(mg) + rect(36, 27, 48, 10, 5, mg.url, dark(c.secondary, 0.4), 1.2);
      s += granules(60, 32, 20, 3, 14, 1.3, light(c.secondary, 0.45), 2, { glint: 0.5 }) + speckle(60, 32, 20, 3, 6, 1, '#f6c945', 4, 0.9);
      return s + `<path d="M30 26.4 H90" stroke="#ffffff" stroke-width="1.4" opacity="0.7"/>`;
    }, { w: 120, h: 56, roles: { primary: 'Bone', secondary: 'Marrow', accent: 'Outline' } }),
  an('blood-vessel', 'Blood vessel', ['blood vessel', 'artery', 'vein', 'capillary', 'circulation', 'endothelium', 'vasculature'], { primary: '#e57373', secondary: '#d94848', accent: '#f8d7d7' },
    (c, u) => {
      const lumen = linear(u, 'l', light(c.accent, 0.3), c.accent);
      let s = defs(lumen) + rect(2, 8, 116, 44, 4, lumen.url, dark(c.primary, 0.35), 2);
      // vessel wall with a row of endothelial cells
      const wall = linear(u, 'w', light(c.primary, 0.2), dark(c.primary, 0.1));
      s += defs(wall) + rect(2, 8, 116, 8, 0, wall.url) + rect(2, 44, 116, 8, 0, wall.url);
      for (let x = 4; x < 116; x += 14) s += ellipse(x + 7, 17.4, 6.6, 2.2, light(c.primary, 0.35), dark(c.primary, 0.3), 0.6) + ellipse(x + 7, 42.6, 6.6, 2.2, light(c.primary, 0.35), dark(c.primary, 0.3), 0.6);
      // biconcave red cells tumbling along the flow
      [[20, 30, 20], [46, 26, -10], [72, 33, 25], [98, 28, -5], [60, 38, 60]].forEach(([x, y, r], i) => {
        const rg = sphere(u, `r${i}`, c.secondary, { hi: 0.35 });
        s += defs(rg) + `<g transform="rotate(${r} ${x} ${y})">${ellipse(x, y, 10, 6.5, rg.url, dark(c.secondary, 0.42), 1.2)}${ellipse(x, y + 0.5, 5.2, 2.8, dark(c.secondary, 0.2))}${ellipse(x - 3, y - 3, 3, 1.2, '#ffffff', 'none', 0, ' opacity="0.5"')}</g>`;
      });
      return s + line(4, 10, 116, 10, '#ffffff', 1.2, ' opacity="0.5"');
    }, { w: 120, h: 60, roles: { primary: 'Vessel wall', secondary: 'Red blood cells', accent: 'Lumen' } }),
  an('lung', 'Lungs', ['lung', 'lungs', 'pulmonary', 'respiratory', 'airway', 'bronchi'], { primary: '#f2a7b3', secondary: '#c4537a', accent: '#e8d0d6' },
    (c, u) => {
      const l = smooth([[40, 22], [26, 30], [12, 60], [12, 88], [28, 92], [44, 82], [46, 50]]), r = smooth([[60, 22], [74, 30], [88, 60], [88, 88], [72, 92], [56, 82], [54, 50]]);
      let s = organ(u, 'l', l, c.primary) + organ(u, 'r', r, c.primary);
      s += speckle(28, 66, 12, 18, 30, 1.6, light(c.primary, 0.35), 2, 0.6) + speckle(72, 66, 12, 18, 30, 1.6, light(c.primary, 0.35), 3, 0.6);
      s += `<path d="M28 38 Q20 60 18 80 M72 38 Q80 60 82 80" fill="none" stroke="${dark(c.primary, 0.2)}" stroke-width="1.2" opacity="0.5"/>`;
      // trachea with cartilage rings, branching bronchi
      s += tube('M50 4 L50 34 M50 34 Q44 40 36 46 M50 34 Q56 40 64 46 M36 46 L30 58 M36 46 L40 62 M64 46 L70 58 M64 46 L60 62 M30 58 L26 70 M30 58 L34 72 M70 58 L74 70 M70 58 L66 72', light(c.secondary, 0.25), 3.2, { hi: false });
      for (let y = 8; y < 32; y += 4.5) s += line(47, y, 53, y, dark(c.secondary, 0.2), 1);
      return s + gloss(26, 42, 4, 9, 0.45, 20) + gloss(74, 42, 4, 9, 0.4, -20);
    }),
  an('liver', 'Liver', ['liver', 'hepatic', 'hepatocyte', 'kupffer'], { primary: '#a8553a', secondary: '#d98a6a', accent: '#a8553a' },
    (c, u) => {
      const d = smooth([[6, 22], [40, 8], [86, 10], [96, 22], [80, 42], [52, 60], [30, 62], [12, 48]]);
      let s = organ(u, 'b', d, c.primary, { r: 90, hi: 0.4 });
      s += `<path d="M58 12 Q54 34 46 58" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="2"/><path d="M60 12 Q56 34 48 58" fill="none" stroke="${light(c.primary, 0.3)}" stroke-width="1" opacity="0.6"/>`;
      // gallbladder and portal vessels underneath
      s += organ(u, 'gb', blob(64, 50, 6, 9, { n: 7, wobble: 0.08, seed: 2, rot: 0.4 }), '#7cb342', { op: 0.25, sw: 1.4 });
      s += tube('M40 60 Q42 66 40 70', '#4a8fe7', 2.6) + tube('M46 58 Q48 64 50 68', '#e85d5d', 2.2);
      return s + gloss(34, 18, 18, 4, 0.45, -10);
    }, { w: 100, h: 70 }),
  an('heart', 'Heart', ['heart', 'cardiac', 'cardiovascular', 'myocardium'], { primary: '#d9534f', secondary: '#4a8fe7', accent: '#e57373' },
    (c, u) => {
      let s = '';
      const ao = capGradV(u, 'ao', c.accent), pa = capGradV(u, 'pa', c.secondary);
      s += defs(ao, pa) + rect(36, 2, 12, 26, 6, ao.url, dark(c.accent, 0.42), 1.6) + rect(52, 6, 12, 22, 6, pa.url, dark(c.secondary, 0.42), 1.6);
      s += tube('M62 12 q14 -6 24 4', c.accent, 6);
      const d = smooth([[30, 24], [58, 22], [80, 34], [86, 56], [70, 80], [48, 96], [34, 80], [18, 56], [18, 34]]);
      s += organ(u, 'b', d, c.primary);
      // interventricular groove with coronary vessels
      s += `<path d="M50 30 Q44 56 56 84" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="2.2" stroke-linecap="round"/>`;
      s += tube('M50 32 Q44 56 55 82', '#e85d5d', 1.4, { hi: false }) + tube('M60 34 Q72 44 74 60 M30 36 Q24 48 26 62', '#f6c945', 1.1, { hi: false });
      return s + gloss(32, 38, 6, 10, 0.5, 25);
    }),
  an('brain', 'Brain', ['brain', 'cns', 'neuro', 'cerebrum', 'neuroinflammation'], { primary: '#f2b8c6', secondary: '#c95f86', accent: '#f2b8c6' },
    (c, u) => {
      const d = smooth([[10, 46], [16, 20], [44, 6], [76, 10], [96, 30], [92, 54], [72, 62], [58, 74], [40, 64], [18, 62]]);
      let s = organ(u, 'b', d, c.primary);
      // gyri and sulci
      const sulci = 'M24 34 q8 -10 16 0 t14 -6 M22 48 q10 -6 18 2 t18 -4 t18 4 M50 20 q6 8 0 14 M70 18 q8 4 4 14 t8 10 M40 56 q8 -4 14 2 M30 20 q4 6 -2 10 M84 40 q-6 4 -2 10 M60 30 q-4 6 2 10';
      s += `<path d="${sulci}" fill="none" stroke="${dark(c.secondary, 0.1)}" stroke-width="2.6" stroke-linecap="round"/><path d="${sulci}" fill="none" stroke="${light(c.primary, 0.45)}" stroke-width="1" stroke-linecap="round" transform="translate(-1 -1.4)" opacity="0.8"/>`;
      s += `<path d="M14 50 Q40 46 70 50" fill="none" stroke="${dark(c.secondary, 0.2)}" stroke-width="1.6" opacity="0.5"/>`;
      // cerebellum and brainstem
      s += organ(u, 'cb', smooth([[60, 64], [74, 60], [80, 70], [70, 80], [62, 76]]), shade(c.primary, -0.08), { sw: 1.8 });
      s += `<path d="M64 66 q6 -2 12 2 M64 70 q6 -2 12 2 M65 74 q4 -1 8 1" fill="none" stroke="${dark(c.secondary, 0.1)}" stroke-width="1" opacity="0.7"/>`;
      return s + gloss(36, 16, 16, 4, 0.5, -10);
    }, { w: 100, h: 84 }),
  an('intestine', 'Intestine / gut', ['intestine', 'gut', 'colon', 'small intestine', 'microbiome', 'mucosa', 'gi tract'], { primary: '#f2a07a', secondary: '#c9653d', accent: '#f8c8b0' },
    (c) => {
      const d = 'M14 20 L86 20 Q96 20 96 30 Q96 40 86 40 L22 40 Q12 40 12 50 Q12 60 22 60 L80 60 Q90 60 90 70 Q90 80 80 80 L30 80';
      let s = `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.42)}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${d}" fill="none" stroke="${c.primary}" stroke-width="13.4" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.1)}" stroke-width="13.4" stroke-dasharray="1.2 3.4" stroke-linejoin="round" opacity="0.55"/>`;
      s += `<path d="${d}" fill="none" stroke="${light(c.primary, 0.45)}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1.4 -3)" opacity="0.8"/>`;
      s += `<path d="${d}" fill="none" stroke="${c.accent}" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round" transform="translate(0 2)" opacity="0.8"/>`;
      return s;
    }),
  an('kidney', 'Kidney', ['kidney', 'renal', 'nephron'], { primary: '#b5523b', secondary: '#f2c46a', accent: '#b5523b' },
    (c, u) => {
      const d = smooth([[50, 8], [80, 14], [90, 48], [78, 86], [50, 92], [36, 76], [44, 58], [40, 40], [34, 24]]);
      let s = tube('M44 50 Q30 52 24 70 L22 98', c.secondary, 4.4) + tube('M42 44 Q32 40 26 36', '#e85d5d', 3) + tube('M42 56 Q32 58 26 62', '#4a8fe7', 3);
      s += organ(u, 'b', d, c.primary);
      // cortex and medullary pyramids around the renal pelvis
      s += path(smooth([[54, 16], [76, 20], [84, 48], [74, 80], [52, 84], [46, 70], [52, 56], [48, 40], [44, 26]]), light(c.primary, 0.12), 'none', 0, ' opacity="0.6"');
      [[64, 26, 30], [74, 46, 0], [66, 68, -30]].forEach(([x, y, r]) => { s += `<path d="M${x - 6} ${y - 6} L${x + 6} ${y - 6} L${x} ${y + 8}Z" fill="${dark(c.primary, 0.12)}" stroke="${dark(c.primary, 0.3)}" stroke-width="0.8" stroke-linejoin="round" transform="rotate(${r} ${x} ${y}) rotate(90 ${x} ${y})"/>`; });
      s += path(blob(52, 50, 6, 10, { n: 7, wobble: 0.1, seed: 2 }), c.secondary, dark(c.secondary, 0.4), 1);
      return s + gloss(64, 20, 10, 4, 0.45, 20);
    }),
  an('skin', 'Skin', ['skin', 'epidermis', 'dermis', 'cutaneous', 'barrier', 'intradermal', 'subcutaneous'], { primary: '#f4c9a8', secondary: '#e89a7e', accent: '#f6e6a8' },
    (c, u) => {
      const derm = linear(u, 'd', light(c.secondary, 0.15), dark(c.secondary, 0.05));
      let s = defs(derm) + rect(2, 30, 116, 56, 0, derm.url, dark(c.secondary, 0.3), 1.4);
      // subcutaneous fat lobules
      s += rect(2, 70, 116, 16, 0, c.accent);
      for (let x = 8; x < 118; x += 12) s += ellipse(x, 78, 6, 6, light(c.accent, 0.35), dark(c.accent, 0.25), 0.8);
      // epidermis with cell layers and the stratum corneum
      s += `<path d="M2 30 L2 16 Q30 10 60 16 T118 14 L118 30 Z" fill="${c.primary}" stroke="${dark(c.primary, 0.35)}" stroke-width="1.6"/>`;
      s += `<path d="M2 16 Q30 10 60 16 T118 14" fill="none" stroke="${light(c.primary, 0.45)}" stroke-width="2.4"/>`;
      for (let x = 6; x < 118; x += 7) s += ellipse(x, 25, 3, 2, dark(c.primary, 0.1), dark(c.primary, 0.25), 0.4);
      // dermal papillae, capillary loops, a hair follicle with its gland
      s += tube('M14 46 q4 -10 8 0 M50 48 q4 -10 8 0 M96 46 q4 -10 8 0', '#e85d5d', 1.4, { hi: false });
      s += `<path d="M30 6 L33 50" stroke="#5b3a29" stroke-width="2.2" stroke-linecap="round"/><path d="M84 4 L82 46" stroke="#5b3a29" stroke-width="2.2" stroke-linecap="round"/>`;
      s += ellipse(34, 54, 5, 6, light(c.secondary, 0.3), dark(c.secondary, 0.35), 1) + ellipse(82, 50, 5, 6, light(c.secondary, 0.3), dark(c.secondary, 0.35), 1) + ellipse(40, 44, 3.4, 2.4, '#f6e2a8', dark('#f6e2a8', 0.3), 0.8);
      return s;
    }, { w: 120, h: 88, roles: { primary: 'Epidermis', secondary: 'Dermis', accent: 'Subcutis' } }),
  an('tumor', 'Tumor mass', ['tumor', 'tumour', 'solid tumor', 'cancer', 'tme', 'tumor microenvironment', 'neoplasm'], { primary: '#c47bc0', secondary: '#7a3a78', accent: '#d94848' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary);
      let s = defs(gr);
      const R = rng(3);
      const lumps = Array.from({ length: 11 }, (_, i) => { const a = (i / 11) * Math.PI * 2; return [50 + Math.cos(a) * 30, 50 + Math.sin(a) * 26, 14 + R() * 6]; });
      lumps.forEach(([x, y, r]) => { s += circle(x, y, r, gr.url, dark(c.primary, 0.42), 1.6) + circle(x - r * 0.3, y - r * 0.35, r * 0.3, '#ffffff', 'none', 0, ' opacity="0.25"'); });
      s += circle(50, 50, 30, gr.url);
      // necrotic core, feeding vessels, scattered nuclei
      s += path(blob(54, 54, 10, 8, { n: 7, wobble: 0.2, seed: 4 }), dark(c.secondary, 0.1), 'none', 0, ' opacity="0.45"');
      s += tube('M10 70 Q30 56 44 58 T70 40 M44 58 L40 40 M58 50 L68 62', c.accent, 1.8);
      return s + granules(50, 50, 26, 22, 14, 2.2, c.secondary, 6, { glint: 0.4, op: 0.75 }) + gloss(34, 24, 10, 5, 0.4);
    }, { shape: 'ellipse', roles: { primary: 'Tumor', secondary: 'Nuclei', accent: 'Vasculature' } }),
];

export function capGradV(u, key, color) {
  const id = `${u}-${key}`;
  return { def: `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(color, -0.15)}"/><stop offset="0.3" stop-color="${shade(color, 0.35)}"/><stop offset="0.65" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.3)}"/></linearGradient>`, url: `url(#${id})` };
}

export const organisms = [
  or('mouse', 'Mouse', ['mouse', 'mice', 'mus musculus', 'murine', 'in vivo', 'animal model', 'c57bl/6'], { primary: '#f1f3f5', secondary: '#f4a6b4', accent: '#1f2933' },
    (c, u) => {
      const gr = sphere(u, 'b', c.primary, { cx: 40, cy: 26, hi: 0.6, lo: -0.18 });
      const body = smooth([[20, 48], [30, 30], [56, 22], [80, 26], [98, 34], [112, 44], [104, 52], [86, 56], [56, 58], [30, 58]]);
      let s = defs(gr);
      s += `<path d="M18 52 C 4 54, 2 64, 10 66 S 22 60, 26 62" fill="none" stroke="${dark(c.secondary, 0.3)}" stroke-width="4" stroke-linecap="round"/><path d="M18 52 C 4 54, 2 64, 10 66 S 22 60, 26 62" fill="none" stroke="${c.secondary}" stroke-width="2.4" stroke-linecap="round"/>`;
      s += `<path d="M36 58 l-2 6 M44 58 l0 6 M80 56 l2 7 M90 54 l4 7" stroke="${dark(c.secondary, 0.25)}" stroke-width="3.6" stroke-linecap="round"/><path d="M36 58 l-2 6 M44 58 l0 6 M80 56 l2 7 M90 54 l4 7" stroke="${c.secondary}" stroke-width="2.2" stroke-linecap="round"/>`;
      s += path(body, gr.url) + rim(u, 'r', body, c.primary, { op: 0.22, from: 0.6 }) + `<path d="${body}" fill="none" stroke="${shade(c.primary, -0.4)}" stroke-width="2"/>`;
      // fur strokes along the back
      s += `<path d="M40 30 q4 -2 8 0 M54 26 q4 -2 8 0 M68 27 q4 -2 8 0 M46 36 q4 -2 8 0 M60 33 q4 -2 8 0" fill="none" stroke="${shade(c.primary, -0.2)}" stroke-width="1" stroke-linecap="round" opacity="0.7"/>`;
      // ear with a pink inner, eye with a glint, nose and whiskers
      s += ellipse(86, 26, 8.5, 10.5, light(c.primary, 0.3), shade(c.primary, -0.4), 1.6) + ellipse(86, 27, 5, 6.4, c.secondary) + ellipse(85, 25.4, 2, 2.6, '#ffffff', 'none', 0, ' opacity="0.5"');
      s += circle(100, 38, 2.8, c.accent) + circle(99.2, 37.2, 0.9, '#ffffff');
      s += circle(112, 44, 2.6, c.secondary, dark(c.secondary, 0.35), 0.6);
      s += `<path d="M108 46 l10 -3 M108 47 l11 1 M108 48 l9 4" stroke="${shade(c.primary, -0.45)}" stroke-width="0.7" stroke-linecap="round"/>`;
      return s + gloss(54, 30, 18, 4, 0.5, -6);
    }, { w: 120, h: 70, size: 110, roles: { primary: 'Fur', secondary: 'Ears / tail / paws', accent: 'Eye' } }),
  or('human', 'Human', ['human', 'patient', 'person', 'donor', 'subject', 'clinical', 'homo sapiens'], { primary: '#7b8794', secondary: '#9aa5b1', accent: '#7b8794' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 35, cy: 20, r: 90, hi: 0.35 });
      const d = 'M10 28 Q25 22 40 28 L44 58 L36 58 L34 40 L33 96 L27 96 L25 64 L23 96 L17 96 L16 40 L14 58 L6 58 Z';
      return defs(g) + circle(25, 12, 10, g.url, dark(c.primary, 0.3), 1.2) + path(d, g.url, dark(c.primary, 0.3), 1.2)
        + gloss(21, 8, 4, 2.4, 0.45) + `<path d="M14 32 Q20 28 26 29" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>`;
    }, { w: 50, h: 100, size: 50 }),
  or('zebrafish', 'Zebrafish', ['zebrafish', 'danio rerio', 'fish', 'model organism'], { primary: '#f6d77a', secondary: '#3f63b5', accent: '#1f2933' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 30, cy: 20, r: 90, hi: 0.4 });
      const body = smooth([[6, 20], [30, 10], [70, 12], [96, 18], [96, 22], [70, 28], [30, 30]]);
      let s = defs(g);
      // fins
      s += path('M94 20 L116 8 L112 20 L116 32 Z', light(c.primary, 0.15), shade(c.primary, -0.4), 1.4) + `<path d="M98 19 L112 11 M98 21 L112 29 M98 20 L112 20" stroke="${c.secondary}" stroke-width="1" opacity="0.6"/>`;
      s += path('M50 11 Q58 2 70 10 Z', light(c.primary, 0.2), shade(c.primary, -0.4), 1.2) + path('M54 28 Q62 36 72 27 Z', light(c.primary, 0.2), shade(c.primary, -0.4), 1.2) + path('M28 24 Q30 32 38 28 Z', light(c.primary, 0.2), shade(c.primary, -0.4), 1);
      s += path(body, g.url);
      for (let i = 0; i < 4; i++) s += `<path d="M${24 + i * 2} ${16 + i * 3} Q60 ${12 + i * 3} 104 ${17 + i * 2}" fill="none" stroke="${c.secondary}" stroke-width="${i % 2 ? 1.6 : 2.4}" opacity="0.85" stroke-linecap="round"/>`;
      s += rim(u, 'r', body, c.primary, { op: 0.25 }) + `<path d="${body}" fill="none" stroke="${shade(c.primary, -0.4)}" stroke-width="1.6"/>`;
      s += circle(16, 18, 3, c.accent) + circle(15.2, 17.2, 1, '#ffffff') + `<path d="M22 16 Q24 20 22 24" fill="none" stroke="${shade(c.primary, -0.35)}" stroke-width="1"/>`;
      return s + gloss(40, 14, 16, 2.4, 0.5, -3);
    }, { w: 120, h: 40, size: 100 }),
  or('drosophila', 'Fruit fly', ['drosophila', 'fruit fly', 'fly', 'insect', 'model organism'], { primary: '#c9a36a', secondary: '#d94848', accent: '#cfe3f5' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { hi: 0.4 });
      const e = sphere(u, 'e', c.secondary, { hi: 0.4 });
      let s = defs(g, e);
      // translucent veined wings
      for (const [cx, rot] of [[32, -25], [68, 25]]) {
        s += ellipse(cx, 30, 22, 12, c.accent, '#9aa5b1', 1, ` opacity="0.75" transform="rotate(${rot} ${cx} 30)"`);
        s += `<g transform="rotate(${rot} ${cx} 30)" stroke="#9aa5b1" stroke-width="0.7" fill="none" opacity="0.8"><path d="M${cx - 18} 30 H${cx + 18} M${cx - 14} 26 Q${cx} 22 ${cx + 16} 26 M${cx - 14} 34 Q${cx} 38 ${cx + 16} 34"/></g>`;
      }
      // legs
      s += `<g stroke="${dark(c.primary, 0.42)}" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M42 40 l-12 4 l-4 8 M42 44 l-12 10 l-2 8 M44 48 l-8 14 M58 40 l12 4 l4 8 M58 44 l12 10 l2 8 M56 48 l8 14"/></g>`;
      s += ellipse(50, 64, 12, 22, g.url, dark(c.primary, 0.42), 1.6);
      for (let y = 56; y < 84; y += 6) s += `<path d="M${40 + (y - 56) * 0.1} ${y} Q50 ${y + 3} ${60 - (y - 56) * 0.1} ${y}" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="2.2" opacity="0.7"/>`;
      s += circle(50, 38, 10, g.url, dark(c.primary, 0.42), 1.6) + circle(50, 24, 8, g.url, dark(c.primary, 0.42), 1.6);
      s += circle(43.5, 21, 4.4, e.url, dark(c.secondary, 0.42), 0.8) + circle(56.5, 21, 4.4, e.url, dark(c.secondary, 0.42), 0.8);
      s += speckle(43.5, 21, 3, 3, 8, 0.4, dark(c.secondary, 0.3), 2, 0.7) + speckle(56.5, 21, 3, 3, 8, 0.4, dark(c.secondary, 0.3), 3, 0.7);
      s += `<path d="M47 16 l-3 -6 M53 16 l3 -6" stroke="${dark(c.primary, 0.42)}" stroke-width="1.2" stroke-linecap="round"/>`;
      return s + gloss(46, 34, 3.4, 2, 0.5) + gloss(46, 58, 3.4, 6, 0.4, 0);
    }, { w: 100, h: 90, size: 80 }),
];

// ---- shading for lab ware ---------------------------------------------------------------

/** Clear plastic or glass: lit from the left, darker toward the right edge. */
export function glassGrad(u, key, base) {
  const id = `${u}-${key}`;
  return { def: `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(base, -0.1)}"/><stop offset="0.18" stop-color="#ffffff"/><stop offset="0.55" stop-color="${base}"/><stop offset="0.88" stop-color="${shade(base, -0.1)}"/><stop offset="1" stop-color="${shade(base, -0.2)}"/></linearGradient>`, url: `url(#${id})` };
}
/** A liquid seen through the wall: lighter in the middle, darker at the sides. */
export function liquidGrad(u, key, color) {
  const id = `${u}-${key}`;
  return { def: `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(color, -0.22)}"/><stop offset="0.3" stop-color="${shade(color, 0.22)}"/><stop offset="0.65" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.28)}"/></linearGradient>`, url: `url(#${id})` };
}
/** Brushed metal or painted plastic housing: lit from the top. */
export function caseGrad(u, key, base) {
  const id = `${u}-${key}`;
  return { def: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="${shade(base, 0.25)}"/><stop offset="0.8" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, -0.15)}"/></linearGradient>`, url: `url(#${id})` };
}
/** A plastic cap: rounded, lit from the top left. */
export function capGrad(u, key, color) {
  const id = `${u}-${key}`;
  return { def: `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(color, -0.15)}"/><stop offset="0.25" stop-color="${shade(color, 0.35)}"/><stop offset="0.6" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.3)}"/></linearGradient>`, url: `url(#${id})` };
}
export const shine = (x, y, h, w = 2.4, op = 0.75) => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(w / 2)}" fill="#ffffff" opacity="${op}"/>`;
export const ridges = (x, y, w, h, k, color) => Array.from({ length: k }, (_, i) => line(x + ((i + 0.5) * w) / k, y + 1, x + ((i + 0.5) * w) / k, y + h - 1, color, 0.8)).join('');

export const lab = [
  lb('flow-cytometer', 'Flow cytometer', ['flow cytometer', 'facs', 'cytometry', 'cell sorter', 'aurora', 'symphony', 'spectral'], { primary: '#e4e7eb', secondary: '#4a8fe7', accent: '#52606d' },
    (c, u) => {
      const gr = caseGrad(u, 'g', c.primary), tube = glassGrad(u, 't', light(c.secondary, 0.65)), cap = capGrad(u, 'c', c.secondary);
      let s = defs(gr, tube, cap) + rect(4, 18, 112, 58, 7, gr.url, dark(c.accent, 0.1), 2);
      s += rect(4, 66, 112, 10, 0, dark(c.primary, 0.12), 'none', 0, ' opacity="0.6"') + rect(10, 76, 12, 3, 1, c.accent) + rect(98, 76, 12, 3, 1, c.accent);
      // screen with a live dot plot and a gate
      s += rect(13, 27, 54, 32, 3, '#1f2933', dark(c.accent, 0.3), 1.2) + speckle(32, 46, 14, 8, 36, 0.9, '#6ee7b7', 2) + speckle(54, 36, 8, 5, 18, 0.9, '#fbbf24', 3);
      s += rect(46, 30, 18, 13, 1.5, 'none', '#ffffff', 0.8, ' stroke-dasharray="2 1.5" opacity="0.8"') + `<path d="M15 29 L40 29 L22 50 Z" fill="#ffffff" opacity="0.07"/>`;
      // sample tube in the loader
      s += rect(84, 10, 12, 20, 3, tube.url, '#7b8794', 1.2) + rect(85, 20, 10, 9, 3, light(c.secondary, 0.3), 'none', 0, ' opacity="0.7"') + rect(83, 3, 14, 8, 2.5, cap.url, dark(c.secondary, 0.4), 1);
      s += rect(76, 38, 30, 5, 2.5, c.secondary, dark(c.secondary, 0.35), 0.8) + rect(76, 48, 30, 5, 2.5, light(c.accent, 0.5), dark(c.accent, 0.1), 0.8);
      s += circle(80, 60, 2.2, '#6abf59', dark('#6abf59', 0.4), 0.6) + circle(87, 60, 2.2, '#f6c945', dark('#f6c945', 0.4), 0.6);
      return s + `<path d="M8 21 H112" stroke="#ffffff" stroke-width="1.6" opacity="0.8" stroke-linecap="round"/>`;
    }, { w: 120, h: 80, roles: { primary: 'Body', secondary: 'Sample tube', accent: 'Outline' } }),
  lb('facs-tube', 'FACS tube (5 mL)', ['facs tube', 'flow tube', 'round bottom', 'polystyrene', 'sample tube'], { primary: '#dbeafe', secondary: '#4a8fe7', accent: '#e85d5d' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent), cap = capGrad(u, 'c', c.secondary);
      return defs(g, l, cap) + `<path d="M8 18 L8 84 A10 10 0 0 0 28 84 L28 18 Z" fill="${g.url}" stroke="#7b8794" stroke-width="1.6"/>`
        + `<path d="M9 66 L9 84 A9 9 0 0 0 27 84 L27 66 Z" fill="${l.url}" opacity="0.88"/>` + ellipse(18, 66, 9, 1.8, light(c.accent, 0.3), 'none', 0, ' opacity="0.9"')
        + shine(11, 22, 58) + rect(5, 2, 26, 17, 4, cap.url, dark(c.secondary, 0.42), 1.6) + ridges(6, 4, 24, 12, 7, dark(c.secondary, 0.25));
    }, { w: 36, h: 100, size: 40, roles: { primary: 'Tube', secondary: 'Cap', accent: 'Sample' } }),
  lb('eppendorf-tube', 'Microcentrifuge tube', ['eppendorf', 'microcentrifuge', '1.5 ml', 'tube', 'sample'], { primary: '#eef2f7', secondary: '#9aa5b1', accent: '#4a8fe7' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent);
      return defs(g, l) + `<path d="M30 10 q14 -10 22 6 l-4 2 q-6 -10 -16 -4" fill="${g.url}" stroke="${c.secondary}" stroke-width="1.4" stroke-linejoin="round"/>`
        + rect(7, 9, 30, 9, 3, g.url, c.secondary, 1.6)
        + `<path d="M10 18 L34 18 L32 56 L24 92 L20 92 L12 56 Z" fill="${g.url}" stroke="${c.secondary}" stroke-width="1.6" stroke-linejoin="round"/>`
        + `<path d="M13 64 L31 64 L24 90 L20 90 Z" fill="${l.url}" opacity="0.85"/>` + ellipse(22, 64, 9, 1.6, light(c.accent, 0.35))
        + `<path d="M14 22 L15 54 L21 84" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>`
        + [30, 38, 46].map((y) => line(26, y, 31, y, c.secondary, 0.9)).join('');
    }, { w: 56, h: 100, size: 46, roles: { primary: 'Tube', secondary: 'Outline', accent: 'Liquid' } }),
  lb('conical-tube', 'Conical tube (15/50 mL)', ['falcon', 'conical', '50 ml', '15 ml', 'tube', 'centrifuge tube'], { primary: '#eef2f7', secondary: '#4a8fe7', accent: '#f6c945' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent), cap = capGrad(u, 'c', c.secondary);
      return defs(g, l, cap) + `<path d="M6 16 L30 16 L30 84 L20 104 L16 104 L6 84 Z" fill="${g.url}" stroke="#7b8794" stroke-width="1.6" stroke-linejoin="round"/>`
        + `<path d="M7 50 L29 50 L29 84 L20 102 L16 102 L7 84 Z" fill="${l.url}" opacity="0.75"/>` + ellipse(18, 50, 11, 1.8, light(c.accent, 0.35))
        + rect(9, 58, 18, 14, 1.5, '#ffffff', '#cbd2d9', 0.6, ' opacity="0.75"') + line(11, 62, 25, 62, '#9aa5b1', 0.8) + line(11, 66, 21, 66, '#9aa5b1', 0.8)
        + [24, 32, 40, 78].map((y) => line(22, y, 28, y, '#9aa5b1', 1)).join('') + shine(9, 20, 60)
        + rect(3, 2, 30, 15, 3, cap.url, dark(c.secondary, 0.42), 1.6) + ridges(4, 3, 28, 13, 9, dark(c.secondary, 0.25));
    }, { w: 36, h: 108, size: 42, roles: { primary: 'Tube', secondary: 'Cap', accent: 'Liquid' } }),
  lb('blood-tube', 'Blood collection tube', ['blood draw', 'vacutainer', 'edta', 'pbmc', 'blood sample', 'phlebotomy'], { primary: '#eef2f7', secondary: '#8c6bd6', accent: '#b8323a' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent), cap = capGrad(u, 'c', c.secondary);
      return defs(g, l, cap) + `<path d="M7 20 L7 90 A11 11 0 0 0 29 90 L29 20 Z" fill="${g.url}" stroke="#7b8794" stroke-width="1.6"/>`
        + `<path d="M8 40 L8 90 A10 10 0 0 0 28 90 L28 40 Z" fill="${l.url}"/>` + ellipse(18, 40, 10, 1.8, light(c.accent, 0.25))
        + rect(8, 25, 20, 30, 0, '#ffffff', '#cbd2d9', 1, ' opacity="0.85"') + line(11, 30, 25, 30, '#9aa5b1', 0.9) + line(11, 35, 22, 35, '#9aa5b1', 0.9) + [0, 1, 2, 3, 4, 5].map((i) => line(11 + i * 2.4, 44, 11 + i * 2.4, 51, '#52606d', i % 2 ? 0.7 : 1.2)).join('')
        + shine(10, 58, 30) + rect(3, 2, 30, 19, 5, cap.url, dark(c.secondary, 0.42), 1.6) + ridges(4, 4, 28, 15, 8, dark(c.secondary, 0.22));
    }, { w: 36, h: 104, size: 40, roles: { primary: 'Tube', secondary: 'Cap (EDTA purple)', accent: 'Blood' } }),
  lb('cryovial', 'Cryovial', ['cryovial', 'cryopreservation', 'frozen', 'biobank', 'vial', 'liquid nitrogen'], { primary: '#eef2f7', secondary: '#e8724a', accent: '#cfe3f5' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent), cap = capGrad(u, 'c', c.secondary);
      return defs(g, l, cap) + `<path d="M8 26 L8 76 Q8 84 18 84 Q28 84 28 76 L28 26 Z" fill="${g.url}" stroke="#7b8794" stroke-width="1.6"/>`
        + rect(9, 50, 18, 31, 7, l.url, 'none', 0, ' opacity="0.95"') + ellipse(18, 50.5, 8.6, 1.5, '#ffffff', 'none', 0, ' opacity="0.7"')
        + rect(10, 31, 16, 15, 1, '#ffffff', '#cbd2d9', 0.8) + line(12, 35, 24, 35, '#9aa5b1', 0.8) + line(12, 39, 20, 39, '#9aa5b1', 0.8)
        + rect(4, 20, 28, 6, 2, '#9aa5b1', '#7b8794', 0.8) + rect(5, 2, 26, 18, 3, cap.url, dark(c.secondary, 0.42), 1.6) + ridges(6, 3, 24, 16, 8, dark(c.secondary, 0.22))
        // a little frost
        + `<g fill="#ffffff" opacity="0.85">${[[12, 60], [22, 70], [15, 76], [24, 58]].map(([x, y]) => `<path d="M${x} ${y - 1.6} L${x + 0.5} ${y - 0.5} L${x + 1.6} ${y} L${x + 0.5} ${y + 0.5} L${x} ${y + 1.6} L${x - 0.5} ${y + 0.5} L${x - 1.6} ${y} L${x - 0.5} ${y - 0.5}Z"/>`).join('')}</g>`;
    }, { w: 36, h: 88, size: 36 }),
  lb('pipette', 'Micropipette', ['pipette', 'micropipette', 'pipetting', 'tip', 'gilson'], { primary: '#e4e7eb', secondary: '#4a8fe7', accent: '#f6c945' },
    (c, u) => {
      const body = capGrad(u, 'b', c.primary), btn = capGrad(u, 'p', c.secondary), tip = glassGrad(u, 't', light(c.accent, 0.4));
      return defs(body, btn, tip) + rect(12, 0, 12, 8, 3, btn.url, dark(c.secondary, 0.42), 1.4) + rect(14, 8, 8, 8, 1, '#9aa5b1', '#7b8794', 0.6)
        + `<path d="M8 16 L28 16 L28 60 L22 70 L14 70 L8 60 Z" fill="${body.url}" stroke="#7b8794" stroke-width="1.6" stroke-linejoin="round"/>`
        + rect(10, 25, 16, 11, 2, '#1f2933', '#52606d', 0.8) + `<text x="18" y="33.4" font-size="6.5" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" fill="#6ee7b7">200</text>`
        + `<path d="M24 22 L32 22 L32 30 L26 34" fill="${body.url}" stroke="#7b8794" stroke-width="1.4" stroke-linejoin="round"/>`
        + ridges(10, 42, 16, 12, 6, dark(c.primary, 0.25)) + shine(10, 18, 40, 1.8, 0.7)
        + `<path d="M15 70 L21 70 L20 88 L16 88 Z" fill="#cbd2d9" stroke="#9aa5b1" stroke-width="0.6"/><path d="M16 88 L20 88 L18.6 110 L17.4 110 Z" fill="${tip.url}" stroke="${dark(c.accent, 0.4)}" stroke-width="0.8"/>`
        + `<path d="M17.2 100 L18.8 100 L18.5 108 L17.5 108 Z" fill="${c.accent}" opacity="0.8"/>`;
    }, { w: 36, h: 112, size: 40, roles: { primary: 'Body', secondary: 'Plunger', accent: 'Tip' } }),
  lb('petri-dish', 'Petri dish', ['petri dish', 'plate', 'culture', 'agar', 'colonies', 'cfu'], { primary: '#e3eef9', secondary: '#f6c945', accent: '#9aa5b1' },
    (c, u) => {
      const agar = sphere(u, 'a', light(c.secondary, 0.55), { cx: 40, cy: 30, hi: 0.25, lo: -0.08 });
      let s = defs(agar) + `<path d="M4 30 L4 37 A46 22 0 0 0 96 37 L96 30" fill="${c.primary}" stroke="${c.accent}" stroke-width="1.8"/>`;
      s += ellipse(50, 30, 46, 22, c.primary, c.accent, 1.8) + ellipse(50, 29, 42, 18, agar.url);
      s += granules(50, 29, 34, 13, 16, 2.4, c.secondary, 4, { glint: 0.6 });
      s += `<path d="M14 22 A38 15 0 0 1 46 12" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>` + `<path d="M8 37 A46 22 0 0 0 30 49" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.7"/>`;
      return s;
    }, { w: 100, h: 60, roles: { primary: 'Dish', secondary: 'Colonies', accent: 'Rim' } }),
  lb('well-plate', '96-well plate', ['96 well', 'well plate', 'microplate', 'elisa', 'assay', 'screening', 'culture plate'], { primary: '#f5f7fa', secondary: '#9aa5b1', accent: '#4a8fe7' },
    (c, u) => {
      const gr = caseGrad(u, 'g', c.primary);
      let s = defs(gr) + rect(2, 4, 116, 78, 6, shade(c.secondary, 0.2)) + rect(2, 2, 116, 76, 6, gr.url, c.secondary, 1.8);
      let wells = '', fills = '', glints = '';
      for (let r = 0; r < 8; r++) for (let k = 0; k < 12; k++) {
        const x = 10 + k * 9.1, y = 10 + r * 8.6;
        const filled = (r * 12 + k) % 5 === 0 || (r < 3 && k < 4);
        wells += `<circle cx="${n(x)}" cy="${n(y)}" r="3.5"/>`;
        if (filled) fills += `<circle cx="${n(x)}" cy="${n(y + 0.4)}" r="2.8" opacity="${n(0.55 + ((r + k) % 4) * 0.12)}"/>`;
        glints += `<circle cx="${n(x - 1.1)}" cy="${n(y - 1.2)}" r="0.9"/>`;
      }
      s += `<g fill="${shade(c.primary, -0.12)}" stroke="${c.secondary}" stroke-width="0.8">${wells}</g><g fill="${c.accent}">${fills}</g><g fill="#ffffff" opacity="0.8">${glints}</g>`;
      return s + `<path d="M6 4.4 H114" stroke="#ffffff" stroke-width="1.4" opacity="0.9"/>`;
    }, { w: 120, h: 82, roles: { primary: 'Plate', secondary: 'Outline', accent: 'Filled wells' } }),
  lb('culture-flask', 'Cell culture flask', ['flask', 't75', 't25', 'culture flask', 'cell culture', 'expansion'], { primary: '#eef2f7', secondary: '#e8724a', accent: '#f2a7b3' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent), cap = capGrad(u, 'c', c.secondary);
      return defs(g, l, cap) + `<path d="M4 20 L70 12 L84 22 L84 50 L70 58 L4 58 Z" fill="${g.url}" stroke="#7b8794" stroke-width="1.8" stroke-linejoin="round"/>`
        + `<path d="M5 44 L83 44 L83 50 L70 57 L5 57 Z" fill="${l.url}" opacity="0.85"/>` + line(6, 44, 82, 44, light(c.accent, 0.4), 1.4)
        + `<path d="M8 24 L66 16" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>` + [20, 32, 44, 56].map((x) => line(x, 50, x, 54, dark(c.accent, 0.2), 0.8)).join('')
        + rect(84, 26, 10, 20, 2, '#cbd2d9', '#7b8794', 1.4) + rect(94, 23, 13, 26, 3, cap.url, dark(c.secondary, 0.42), 1.4) + ridges(95, 24, 11, 24, 5, dark(c.secondary, 0.22));
    }, { w: 110, h: 64, roles: { primary: 'Flask', secondary: 'Cap', accent: 'Medium' } }),
  lb('erlenmeyer-flask', 'Erlenmeyer flask', ['erlenmeyer', 'flask', 'conical flask', 'media', 'reagent'], { primary: '#eef2f7', secondary: '#9aa5b1', accent: '#6abf59' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent);
      return defs(g, l) + `<path d="M28 4 L28 34 L6 86 Q4 94 12 94 L58 94 Q66 94 64 86 L42 34 L42 4 Z" fill="${g.url}" stroke="${c.secondary}" stroke-width="2" stroke-linejoin="round"/>`
        + rect(24, 2, 22, 5, 2, c.primary, c.secondary, 1.6)
        + `<path d="M16 64 L54 64 L63 86 Q64 92 58 92 L12 92 Q6 92 7 86 Z" fill="${l.url}" opacity="0.8"/>` + ellipse(35, 64, 19, 2.2, light(c.accent, 0.35))
        + `<path d="M30 10 L30 36 L12 80" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`
        + circle(30, 80, 1.6, '#ffffff', 'none', 0, ' opacity="0.7"') + circle(44, 74, 1.2, '#ffffff', 'none', 0, ' opacity="0.7"') + circle(38, 84, 1, '#ffffff', 'none', 0, ' opacity="0.7"');
    }, { w: 70, h: 98, size: 60 }),
  lb('beaker', 'Beaker', ['beaker', 'glassware', 'solution', 'reagent', 'buffer'], { primary: '#eef2f7', secondary: '#9aa5b1', accent: '#4a8fe7' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent);
      return defs(g, l) + `<path d="M6 6 L64 6 L60 12 L60 84 Q60 90 54 90 L16 90 Q10 90 10 84 L10 12 Z" fill="${g.url}" stroke="${c.secondary}" stroke-width="2" stroke-linejoin="round"/>`
        + `<path d="M11 44 H59 V84 Q59 89 54 89 H16 Q11 89 11 84Z" fill="${l.url}" opacity="0.72"/>` + ellipse(35, 44, 24, 2.4, light(c.accent, 0.4))
        + [24, 34, 44, 54, 64].map((y) => line(48, y, 58, y, c.secondary, 1.2)).join('') + shine(14, 14, 66, 2.6)
        + circle(26, 70, 1.6, '#ffffff', 'none', 0, ' opacity="0.7"') + circle(40, 60, 1.2, '#ffffff', 'none', 0, ' opacity="0.7"');
    }, { w: 70, h: 94, size: 60 }),
  lb('syringe', 'Syringe / injection', ['syringe', 'injection', 'needle', 'vaccine', 'dose', 'iv', 'administration', 'treatment'], { primary: '#eef2f7', secondary: '#9aa5b1', accent: '#e85d5d' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), l = liquidGrad(u, 'l', c.accent), pl = capGrad(u, 'p', c.secondary);
      const gv = { def: g.def.replace('x2="1" y2="0"', 'x2="0" y2="1"'), url: g.url };
      const lv = { def: l.def.replace('x2="1" y2="0"', 'x2="0" y2="1"'), url: l.url };
      return defs(gv, lv, pl.def.replace('x2="1" y2="0"', 'x2="0" y2="1"')) + rect(2, 10, 8, 20, 2, pl.url, dark(c.secondary, 0.35), 1) + rect(10, 18, 16, 4, 1, c.secondary)
        + rect(26, 8, 60, 24, 3, gv.url, '#7b8794', 1.6) + rect(50, 10, 35, 20, 2, lv.url, 'none', 0, ' opacity="0.85"') + rect(46, 10, 5, 20, 1.5, '#52606d')
        + rect(24, 4, 4, 32, 1, '#7b8794') + `<path d="M86 14 L94 18 L94 22 L86 26 Z" fill="${c.secondary}" stroke="#7b8794" stroke-width="0.8"/>` + line(94, 20, 120, 20, '#9aa5b1', 1.6) + line(94, 19.4, 118, 19.4, '#ffffff', 0.6)
        + [34, 42, 50, 58, 66, 74].map((x) => line(x, 8, x, 14, '#7b8794', 1)).join('') + `<path d="M28 11 H84" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
    }, { w: 122, h: 40, roles: { primary: 'Barrel', secondary: 'Plunger', accent: 'Contents' } }),
  lb('microscope', 'Microscope', ['microscope', 'imaging', 'microscopy', 'confocal', 'histology'], { primary: '#e4e7eb', secondary: '#52606d', accent: '#4a8fe7' },
    (c, u) => {
      const tube = capGrad(u, 't', c.primary), base = caseGrad(u, 'b', light(c.secondary, 0.15));
      let s = defs(tube, base) + rect(8, 86, 74, 10, 4, base.url, dark(c.secondary, 0.3), 1.2);
      s += `<path d="M58 88 L58 70 Q74 50 60 22" fill="none" stroke="${dark(c.secondary, 0.3)}" stroke-width="11" stroke-linecap="round"/><path d="M58 88 L58 70 Q74 50 60 22" fill="none" stroke="${c.secondary}" stroke-width="8" stroke-linecap="round"/><path d="M61 84 L61 70 Q74 52 63 26" fill="none" stroke="${light(c.secondary, 0.4)}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`;
      s += circle(66, 66, 5.5, light(c.secondary, 0.25), dark(c.secondary, 0.3), 1.2) + circle(66, 66, 2, dark(c.secondary, 0.2));
      s += rect(16, 61, 48, 7, 2, base.url, dark(c.secondary, 0.3), 1) + rect(26, 57, 26, 4, 1, light(c.accent, 0.45), dark(c.accent, 0.2), 0.6) + circle(39, 59, 1.6, '#e85d5d', 'none', 0, ' opacity="0.8"');
      s += `<g transform="rotate(-30 40 30)">${rect(32, 2, 16, 48, 4, tube.url, c.secondary, 2)}${rect(35, 50, 10, 10, 2, c.secondary)}${rect(30, -1, 20, 7, 2, c.accent, dark(c.accent, 0.35), 1)}${rect(32, 20, 16, 3, 1, c.accent, 'none', 0, ' opacity="0.8"')}</g>`;
      // light from below
      s += `<path d="M36 68 L42 68 L44 86 L34 86Z" fill="#f6e7a8" opacity="0.55"/>`;
      return s;
    }, { w: 90, h: 100, size: 80 }),
  lb('centrifuge', 'Centrifuge', ['centrifuge', 'spin', 'pellet', 'separation', 'ficoll'], { primary: '#e4e7eb', secondary: '#52606d', accent: '#4a8fe7' },
    (c, u) => {
      const gr = caseGrad(u, 'g', c.primary), lid = sphere(u, 'l', light(c.accent, 0.45), { cx: 35, cy: 20, hi: 0.5 });
      let s = defs(gr, lid) + rect(6, 30, 98, 42, 9, gr.url, c.secondary, 2) + rect(6, 64, 98, 8, 0, dark(c.primary, 0.12), 'none', 0, ' opacity="0.6"');
      s += `<path d="M12 30 Q55 0 98 30 Z" fill="${lid.url}" stroke="${c.secondary}" stroke-width="2"/>` + `<path d="M22 24 Q40 10 58 10" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.8"/>`;
      s += rect(16, 42, 28, 15, 2.5, '#1f2933', dark(c.secondary, 0.3), 1) + `<text x="30" y="52.6" font-size="7" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" fill="#6ee7b7">400g</text>`;
      s += circle(80, 50, 8, c.accent, dark(c.accent, 0.42), 1.4) + circle(78, 48, 2.6, '#ffffff', 'none', 0, ' opacity="0.6"') + circle(62, 50, 3, '#6abf59', dark('#6abf59', 0.4), 0.8);
      return s + `<path d="M12 33 H98" stroke="#ffffff" stroke-width="1.4" opacity="0.8"/>`;
    }, { w: 110, h: 76, size: 90 }),
  lb('sequencer', 'Sequencer', ['sequencer', 'ngs', 'sequencing', 'illumina', 'scrna-seq', 'genomics', 'novaseq'], { primary: '#f5f7fa', secondary: '#52606d', accent: '#6abf59' },
    (c, u) => {
      const gr = caseGrad(u, 'g', c.primary);
      let s = defs(gr) + rect(6, 6, 96, 78, 9, gr.url, c.secondary, 2) + rect(14, 14, 54, 34, 3, '#1f2933', dark(c.secondary, 0.3), 1);
      // flow cell with clusters of four colors
      const cols = ['#e85d5d', '#4a8fe7', '#6abf59', '#f6c945'];
      cols.forEach((col, i) => { s += rect(19 + i * 12, 30 - i * 4, 9, 14 + i * 4, 1.5, col) + rect(20 + i * 12, 31 - i * 4, 2.4, 12 + i * 4, 1, '#ffffff', 'none', 0, ' opacity="0.35"'); });
      s += `<path d="M16 16 L44 16 L22 40 Z" fill="#ffffff" opacity="0.07"/>`;
      s += rect(74, 16, 20, 30, 3, light(c.secondary, 0.65), dark(c.secondary, 0.2), 1) + rect(78, 22, 12, 18, 2, light(c.accent, 0.35), dark(c.accent, 0.3), 0.8);
      s += rect(14, 56, 80, 7, 3.5, c.accent, dark(c.accent, 0.35), 0.8) + rect(16, 57, 76, 2, 1, '#ffffff', 'none', 0, ' opacity="0.5"');
      return s + rect(14, 68, 80, 8, 2, dark(c.primary, 0.06), dark(c.primary, 0.2), 0.6) + `<path d="M12 9 H96" stroke="#ffffff" stroke-width="1.4" opacity="0.9"/>`;
    }, { w: 108, h: 90, size: 90 }),
  lb('computer', 'Computer / analysis', ['computer', 'laptop', 'analysis', 'bioinformatics', 'software', 'data', 'in silico'], { primary: '#52606d', secondary: '#dbeafe', accent: '#4a8fe7' },
    (c, u) => {
      const scr = linear(u, 's', '#ffffff', c.secondary), base = caseGrad(u, 'b', shade(c.primary, 0.25));
      let s = defs(scr, base) + rect(14, 6, 82, 54, 4, c.primary, dark(c.primary, 0.3), 1) + rect(19, 11, 72, 44, 2, scr.url);
      s += [[26, 46, 6], [34, 40, 12], [42, 44, 8], [50, 34, 18]].map(([x, y, h]) => rect(x, y, 5, h, 1, light(c.accent, 0.35))).join('');
      s += `<path d="M24 46 L36 34 L48 40 L62 22 L84 30" fill="none" stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` + [[36, 34], [48, 40], [62, 22], [84, 30]].map(([x, y]) => circle(x, y, 2, '#ffffff', c.accent, 1.2)).join('');
      s += `<path d="M19 11 L52 11 L19 40 Z" fill="#ffffff" opacity="0.25"/>`;
      return s + `<path d="M6 62 L104 62 L96 70 L14 70 Z" fill="${base.url}" stroke="${c.primary}" stroke-width="1.4"/>` + rect(46, 63, 18, 2, 1, dark(c.primary, 0.1));
    }, { w: 110, h: 72, size: 90 }),
];

export const axes = (c, x0 = 10, y0 = 90, x1 = 96, y1 = 4) => line(x0, y0, x1, y0, c, 1.8) + line(x0, y0, x0, y1, c, 1.8)
  + [0.25, 0.5, 0.75].map((t) => line(x0 + (x1 - x0) * t, y0, x0 + (x1 - x0) * t, y0 + 2.6, c, 1.2) + line(x0 - 2.6, y0 - (y0 - y1) * t, x0, y0 - (y0 - y1) * t, c, 1.2)).join('');

export const charts = [
  ch('flow-plot', 'Flow cytometry dot plot', ['flow plot', 'facs plot', 'dot plot', 'gating', 'gate', 'cytometry', 'scatter'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#1f2933' },
    (c) => {
      // density-coloured events: cool at the edges, hot in the dense core
      const R = rng(5);
      const pop = (cx, cy, sx, sy, k, col) => {
        let out = '';
        for (let i = 0; i < k; i++) {
          const g = (R() + R() + R()) / 3 - 0.5, h = (R() + R() + R()) / 3 - 0.5;
          const dd = Math.hypot(g, h);
          const fill = dd < 0.1 ? '#f6c945' : dd < 0.17 ? shade(col, 0.25) : col;
          out += `<circle cx="${n(cx + g * sx)}" cy="${n(cy + h * sy)}" r="1.3" fill="${fill}"/>`;
        }
        return out;
      };
      let s = rect(10, 4, 86, 86, 0, '#ffffff');
      s += `<g opacity="0.9">${pop(34, 72, 40, 34, 150, c.primary)}${pop(72, 26, 40, 34, 90, c.secondary)}</g>`;
      s += rect(55, 7, 38, 38, 3, c.secondary, 'none', 0, ' opacity="0.08"') + rect(55, 7, 38, 38, 3, 'none', c.accent, 1.6, ' stroke-dasharray="4 3"');
      s += `<text x="90" y="16" font-size="8" font-family="Arial, sans-serif" font-weight="bold" text-anchor="end" fill="${c.accent}">38.2</text>`;
      return s + axes(c.accent);
    }, { size: 90, roles: { primary: 'Population 1', secondary: 'Population 2', accent: 'Axes & gate' } }),
  ch('histogram', 'Histogram overlay', ['histogram', 'mfi', 'expression', 'flow histogram', 'overlay', 'distribution'], { primary: '#9aa5b1', secondary: '#e85d5d', accent: '#1f2933' },
    (c, u) => {
      const a = linear(u, 'a', light(c.primary, 0.35), c.primary), b = linear(u, 'b', light(c.secondary, 0.35), c.secondary);
      return defs(a, b) + `<path d="M10 76 C 20 76, 22 20, 32 20 S 44 76, 56 76 Z" fill="${a.url}" opacity="0.75" stroke="${dark(c.primary, 0.35)}" stroke-width="1.4"/>`
        + `<path d="M36 76 C 50 76, 54 12, 66 12 S 80 76, 94 76 Z" fill="${b.url}" opacity="0.75" stroke="${dark(c.secondary, 0.35)}" stroke-width="1.4"/>`
        + line(66, 10, 66, 76, dark(c.secondary, 0.3), 1, ' stroke-dasharray="2 2"') + axes(c.accent, 8, 76, 98, 4);
    }, { w: 100, h: 80, size: 90, roles: { primary: 'Control', secondary: 'Sample', accent: 'Axes' } }),
  ch('umap', 'UMAP / t-SNE clusters', ['umap', 'tsne', 'clusters', 'single cell', 'scrna-seq', 'embedding', 'dimensionality reduction'], { primary: '#4a8fe7', secondary: '#e85d5d', accent: '#6abf59' },
    (c) => {
      const R = rng(11);
      const cl = [[30, 30, c.primary, 16], [70, 34, c.secondary, 14], [44, 70, c.accent, 15], [78, 72, '#f6c945', 10], [18, 60, '#8c6bd6', 9]];
      return cl.map(([x, y, col, r]) => {
        let d = '';
        for (let i = 0; i < 55; i++) { const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * r; d += `<circle cx="${n(x + Math.cos(a) * rr * 1.2)}" cy="${n(y + Math.sin(a) * rr)}" r="1.5"/>`; }
        return `<ellipse cx="${x}" cy="${y}" rx="${n(r * 1.35)}" ry="${n(r * 1.15)}" fill="${col}" opacity="0.1"/><g fill="${col}" stroke="${dark(col, 0.3)}" stroke-width="0.3" opacity="0.9">${d}</g>`;
      }).join('') + `<path d="M4 96 h12 M4 96 v-12" stroke="#52606d" stroke-width="1.4" stroke-linecap="round"/>`;
    }, { size: 90 }),
  ch('bar-chart', 'Bar chart', ['bar chart', 'bar graph', 'quantification', 'statistics', 'data'], { primary: '#9aa5b1', secondary: '#4a8fe7', accent: '#1f2933' },
    (c, u) => {
      const a = linear(u, 'a', light(c.primary, 0.3), c.primary, { x2: 1, y2: 0 }), b = linear(u, 'b', light(c.secondary, 0.3), c.secondary, { x2: 1, y2: 0 });
      let s = defs(a, b);
      const bars = [[18, 46, a.url, c.primary], [42, 26, b.url, c.secondary], [66, 14, b.url, c.secondary]];
      const R = rng(7);
      bars.forEach(([x, y, f, col]) => {
        s += rect(x, y, 16, 76 - y, 1.5, f, dark(col, 0.35), 1);
        // individual data points over each bar, mean ± SEM
        for (let i = 0; i < 5; i++) s += circle(x + 3 + R() * 10, y + (R() - 0.5) * 12, 1.5, '#ffffff', dark(col, 0.45), 0.8);
        s += line(x + 8, y - 8, x + 8, y + 6, c.accent, 1.3) + line(x + 5, y - 8, x + 11, y - 8, c.accent, 1.3);
      });
      s += `<path d="M26 10 V6 H74 V10" fill="none" stroke="${c.accent}" stroke-width="1.1"/><text x="50" y="5" font-size="6" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" fill="${c.accent}">***</text>`;
      return s + axes(c.accent, 8, 76, 94, 4);
    }, { w: 100, h: 80, size: 90 }),
  ch('heatmap', 'Heatmap', ['heatmap', 'expression', 'clustering', 'matrix', 'transcriptomics'], { primary: '#e85d5d', secondary: '#4a8fe7', accent: '#ffffff' },
    (c) => {
      const R = rng(4);
      let s = '';
      // dendrogram over the columns
      s += `<path d="M20 12 V6 H44 V12 M32 6 V2 H68 V6 M56 12 V6 H80 V12 M68 2" fill="none" stroke="#52606d" stroke-width="1"/>`;
      for (let r = 0; r < 6; r++) for (let k = 0; k < 8; k++) {
        const v = R();
        const col = v > 0.5 ? shade(c.primary, (1 - v) * 1.2 - 0.1) : shade(c.secondary, v * 1.2 - 0.1);
        s += rect(14 + k * 10.6, 14 + r * 10.6, 10.2, 10.2, 1, col);
      }
      // colour key
      s += [0, 1, 2, 3, 4].map((i) => rect(4, 14 + i * 12.6, 6, 12.6, 0, i < 2 ? shade(c.primary, i * 0.3) : i === 2 ? '#f5f5f5' : shade(c.secondary, (4 - i) * 0.3))).join('');
      return s + rect(4, 14, 6, 63, 0, 'none', '#9aa5b1', 0.6);
    }, { w: 104, h: 80, size: 90, roles: { primary: 'High', secondary: 'Low', accent: 'Mid' } }),
  ch('survival-curve', 'Survival curve', ['survival', 'kaplan meier', 'km curve', 'clinical outcome', 'overall survival', 'efficacy'], { primary: '#9aa5b1', secondary: '#e85d5d', accent: '#1f2933' },
    (c) => {
      let s = `<path d="M10 8 H34 V14 H50 V24 H64 V30 H80 V34 H94 V74 H10Z" fill="${c.secondary}" opacity="0.08"/>`;
      s += `<path d="M10 8 H24 V22 H34 V36 H44 V50 H56 V62 H70 V68 H94" fill="none" stroke="${c.primary}" stroke-width="2.6"/>`;
      s += `<path d="M10 8 H34 V14 H50 V24 H64 V30 H80 V34 H94" fill="none" stroke="${c.secondary}" stroke-width="2.6"/>`;
      // censored observations
      [[29, 22, c.primary], [62, 62, c.primary], [42, 14, c.secondary], [72, 30, c.secondary], [88, 34, c.secondary]].forEach(([x, y, col]) => { s += line(x, y - 3, x, y + 3, col, 1.4); });
      s += `<text x="92" y="48" font-size="7" font-family="Arial, sans-serif" font-style="italic" text-anchor="end" fill="${c.accent}">p &lt; 0.01</text>`;
      return s + axes(c.accent, 8, 76, 96, 4);
    }, { w: 100, h: 80, size: 90, roles: { primary: 'Control', secondary: 'Treatment', accent: 'Axes' } }),
  ch('lightning', 'Stimulation (lightning)', ['lightning', 'stimulation', 'activation', 'signal', 'trigger', 'energy'], { primary: '#f6c945', secondary: '#c9871f' },
    (c, u) => {
      const g = linear(u, 'g', light(c.primary, 0.45), shade(c.primary, -0.1), { x2: 1, y2: 1 });
      const d = 'M58 2 L18 56 L44 56 L34 98 L82 36 L54 36 L70 2 Z';
      return defs(g) + path(d, g.url, c.secondary, 2.4) + `<path d="M56 8 L26 50" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="0.7"/><path d="M58 42 L40 84" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="0.55"/>`;
    }, { size: 50 }),
  ch('burst', 'Burst / cell death', ['burst', 'explosion', 'lysis', 'death', 'impact', 'release'], { primary: '#f39a3d', secondary: '#e85d5d' },
    (c, u) => {
      const g = sphere(u, 'g', c.primary, { cx: 50, cy: 50, r: 55, hi: 0.5 }), g2 = sphere(u, 'h', c.secondary, { cx: 50, cy: 50, r: 60, hi: 0.45 });
      const pts = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 22 : 46; return `${i ? 'L' : 'M'}${n(50 + Math.cos(a) * r)} ${n(50 + Math.sin(a) * r)}`; }).join(' ') + 'Z';
      const pts2 = Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2 + 0.2, r = i % 2 ? 12 : 26; return `${i ? 'L' : 'M'}${n(50 + Math.cos(a) * r)} ${n(50 + Math.sin(a) * r)}`; }).join(' ') + 'Z';
      return defs(g, g2) + path(pts, g.url, dark(c.primary, 0.35), 2) + path(pts2, g2.url, dark(c.secondary, 0.35), 1.4) + circle(50, 50, 6, '#fff6d6', 'none', 0, ' opacity="0.9"');
    }, { size: 60, shape: 'ellipse' }),
  ch('checkmark', 'Checkmark', ['check', 'yes', 'success', 'positive', 'correct'], { primary: '#43a047', secondary: '#ffffff' },
    (c, u) => {
      const g = sphere(u, 'g', c.primary, { hi: 0.4 });
      return defs(g) + circle(50, 50, 44, g.url, dark(c.primary, 0.3), 2) + `<path d="M28 54 L44 70 L74 36" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<path d="M28 52 L44 68 L74 34" fill="none" stroke="${c.secondary}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>` + gloss(34, 26, 16, 7, 0.4, -25);
    }, { size: 40, shape: 'ellipse' }),
  ch('cross', 'Cross mark', ['cross', 'x', 'no', 'fail', 'negative', 'blocked'], { primary: '#e53935', secondary: '#ffffff' },
    (c, u) => {
      const g = sphere(u, 'g', c.primary, { hi: 0.4 });
      return defs(g) + circle(50, 50, 44, g.url, dark(c.primary, 0.3), 2) + `<path d="M32 34 L68 70 M68 34 L32 70" fill="none" stroke="${dark(c.primary, 0.35)}" stroke-width="10" stroke-linecap="round"/>`
        + `<path d="M32 32 L68 68 M68 32 L32 68" fill="none" stroke="${c.secondary}" stroke-width="10" stroke-linecap="round"/>` + gloss(34, 26, 16, 7, 0.4, -25);
    }, { size: 40, shape: 'ellipse' }),
  ch('clock', 'Clock / time', ['clock', 'time', 'timepoint', 'hours', 'kinetics', 'incubation'], { primary: '#ffffff', secondary: '#52606d', accent: '#e85d5d' },
    (c, u) => {
      const face = sphere(u, 'f', c.primary, { hi: 0.1, lo: -0.08 }), rim = linear(u, 'r', light(c.secondary, 0.4), dark(c.secondary, 0.2), { x2: 1, y2: 1 });
      return defs(face, rim) + circle(50, 50, 44, rim.url) + circle(50, 50, 38, face.url, dark(c.secondary, 0.2), 1)
        + Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return line(50 + Math.cos(a) * (i % 3 ? 33 : 30), 50 + Math.sin(a) * (i % 3 ? 33 : 30), 50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36, c.secondary, i % 3 ? 1.6 : 2.8); }).join('')
        + line(51, 51.5, 51, 25.5, dark(c.secondary, 0.2), 5, ' opacity="0.25"') + line(50, 50, 50, 24, c.secondary, 5) + line(50, 50, 68, 58, c.accent, 4) + circle(50, 50, 4, c.secondary)
        + `<path d="M24 30 A32 32 0 0 1 54 16" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
    }, { size: 50, shape: 'ellipse' }),
  ch('magnifier', 'Magnifying glass', ['magnifier', 'zoom', 'search', 'inset', 'detail', 'magnify'], { primary: '#dbeafe', secondary: '#52606d' },
    (c, u) => {
      const lens = sphere(u, 'l', c.primary, { hi: 0.6, lo: -0.05 }), handle = linear(u, 'h', light(c.secondary, 0.35), dark(c.secondary, 0.2), { x2: 1, y2: 0 });
      return defs(lens, handle) + `<path d="M62 62 L92 92" stroke="${dark(c.secondary, 0.3)}" stroke-width="14" stroke-linecap="round"/><path d="M62 62 L92 92" stroke="${c.secondary}" stroke-width="10" stroke-linecap="round"/><path d="M64 61 L90 87" stroke="${light(c.secondary, 0.45)}" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>`
        + circle(40, 40, 30, lens.url, c.secondary, 7) + circle(40, 40, 33.5, 'none', light(c.secondary, 0.45), 1.2, ' opacity="0.8"')
        + `<path d="M22 32 A20 20 0 0 1 36 18" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.85"/>` + gloss(48, 50, 6, 3, 0.4, -30);
    }, { size: 50 }),
  ch('gear', 'Gear / process', ['gear', 'process', 'mechanism', 'engineering', 'settings', 'manufacturing'], { primary: '#9aa5b1', secondary: '#52606d' },
    (c, u) => {
      const g = linear(u, 'g', light(c.primary, 0.45), dark(c.primary, 0.15), { x2: 1, y2: 1 });
      let d = '';
      for (let i = 0; i < 16; i++) { const a0 = (i / 16) * Math.PI * 2, r = i % 2 ? 34 : 44; const a1 = ((i + 1) / 16) * Math.PI * 2; d += `${i ? 'L' : 'M'}${n(50 + Math.cos(a0) * r)} ${n(50 + Math.sin(a0) * r)} L${n(50 + Math.cos(a1) * r)} ${n(50 + Math.sin(a1) * r)} `; }
      return defs(g) + path(d + 'Z', g.url, c.secondary, 2.4) + circle(50, 50, 24, 'none', dark(c.primary, 0.15), 2, ' opacity="0.6"')
        + circle(50, 50, 13, '#ffffff', c.secondary, 2.4) + circle(50, 50, 13, 'none', dark(c.primary, 0.1), 3, ' opacity="0.3"') + `<path d="M22 34 A32 32 0 0 1 40 18" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity="0.7"/>`;
    }, { size: 50, shape: 'ellipse' }),
];
