// More model organisms, research animals, disease vectors and a plant.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, smooth, smoothOpen, blob, ring, speckle, rim } from './kit.js';
import { taper } from './cellkit.js';

const or = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Organisms', tags, colors, roles: { primary: 'Body', secondary: 'Details', accent: 'Eye / features' }, draw, size: 110, w: 120, h: 80, ...extra });

/** Body with soft fur shading and an outline. */
function fur(u, key, d, col, { hi = 0.5, sw = 2 } = {}) {
  const g = sphere(u, key, col, { cx: 40, cy: 26, hi, lo: -0.18 });
  return defs(g) + path(d, g.url) + rim(u, `${key}r`, d, col, { op: 0.22, from: 0.6 }) + `<path d="${d}" fill="none" stroke="${shade(col, -0.42)}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}
/** A limb or tail stroke with an outline. */
const limb = (d, col, w = 4.4) => `<path d="${d}" fill="none" stroke="${shade(col, -0.42)}" stroke-width="${n(w + 2)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const eye = (x, y, r = 2.6, col = '#1f2933') => circle(x, y, r, col) + circle(x - r * 0.32, y - r * 0.32, r * 0.36, '#ffffff');
const tail = (pts, col, w0, w1) => path(taper(pts, w0, w1), col, shade(col, -0.42), 1.4);

export const organisms2 = [
  or('rat', 'Rat', ['rat', 'rattus norvegicus', 'sprague dawley', 'wistar', 'rodent', 'animal model', 'in vivo'], { primary: '#ece6dc', secondary: '#f2a7b3', accent: '#c0303a' },
    (c, u) => {
      let s = tail([[24, 50], [12, 54], [6, 62], [10, 70], [24, 72], [34, 70]], c.secondary, 5.4, 1.6);
      s += limb('M38 58 l-3 8 M48 60 l-1 8 M86 56 l2 8 M96 54 l4 7', c.secondary, 2.6);
      s += fur(u, 'b', smooth([[22, 48], [28, 30], [52, 20], [80, 22], [100, 30], [116, 42], [108, 52], [88, 56], [56, 60], [30, 58]]), c.primary);
      s += `<path d="M42 30 q4 -2 8 0 M56 26 q4 -2 8 0 M70 26 q4 -2 8 0 M48 36 q4 -2 8 0" fill="none" stroke="${shade(c.primary, -0.2)}" stroke-width="1" opacity="0.7"/>`;
      s += ellipse(90, 26, 6, 7, light(c.primary, 0.3), shade(c.primary, -0.4), 1.4) + ellipse(90, 27, 3.4, 4.2, c.secondary);
      return s + eye(102, 36, 2.6, c.accent) + circle(116, 43, 2.4, c.secondary, shade(c.secondary, -0.35), 0.6) + `<path d="M112 45 l8 -3 M112 46 l9 1 M112 47 l7 4" stroke="${shade(c.primary, -0.45)}" stroke-width="0.7"/>` + gloss(56, 28, 18, 4, 0.5, -6);
    }, { roles: { primary: 'Fur', secondary: 'Ears / tail / paws', accent: 'Eye' } }),
  or('rabbit', 'Rabbit', ['rabbit', 'new zealand white', 'oryctolagus', 'immunization', 'polyclonal antibody', 'animal model'], { primary: '#f1f3f5', secondary: '#f4a6b4', accent: '#c0303a' },
    (c, u) => {
      let s = '';
      [[74, 10, -14], [84, 12, 6]].forEach(([x, y, a], i) => { s += `<g transform="rotate(${a} ${x} ${y + 14})">${fur(u, `e${i}`, smooth([[x - 5, y + 22], [x - 6, y + 4], [x, y - 8], [x + 6, y + 4], [x + 5, y + 22]]), c.primary)}${ellipse(x, y + 6, 2.6, 11, c.secondary, 'none', 0, ' opacity="0.8"')}</g>`; });
      s += circle(18, 54, 8, '#ffffff', shade(c.primary, -0.35), 1.4);
      s += fur(u, 'b', smooth([[20, 60], [24, 40], [44, 32], [64, 36], [70, 50], [74, 66], [56, 74], [30, 74]]), c.primary);
      s += fur(u, 'h', smooth([[64, 40], [74, 28], [88, 28], [98, 40], [96, 52], [84, 56], [70, 54]]), c.primary);
      s += limb('M66 70 Q74 74 80 72', c.primary, 5) + path(smooth([[30, 70], [44, 62], [56, 70], [50, 76], [32, 76]]), shade(c.primary, -0.06), shade(c.primary, -0.4), 1.4);
      return s + eye(86, 38, 2.8, c.accent) + circle(97, 44, 1.8, c.secondary) + gloss(42, 40, 12, 4, 0.5, -10);
    }, { w: 110, h: 80, roles: { primary: 'Fur', secondary: 'Inner ears / nose', accent: 'Eye' } }),
  or('pig', 'Pig', ['pig', 'swine', 'porcine', 'minipig', 'large animal model', 'xenotransplantation'], { primary: '#f6b8c0', secondary: '#e8899a', accent: '#1f2933' },
    (c, u) => {
      let s = `<path d="M18 40 q-8 -4 -6 -10 q2 -6 8 -2 q4 4 -2 6" fill="none" stroke="${shade(c.primary, -0.4)}" stroke-width="2.2" stroke-linecap="round"/>`;
      s += limb('M34 58 V72 M48 60 V74 M78 60 V74 M90 58 V72', shade(c.primary, -0.05), 6) + limb('M34 72 V74 M48 74 V76 M78 74 V76 M90 72 V74', c.secondary, 6);
      s += fur(u, 'b', smooth([[20, 44], [30, 28], [60, 22], [90, 26], [104, 36], [108, 52], [92, 64], [56, 66], [28, 60]]), c.primary);
      s += path('M88 30 L96 16 L100 32 Z', shade(c.primary, -0.05), shade(c.primary, -0.42), 1.4);
      s += ellipse(110, 46, 5, 7, c.secondary, shade(c.secondary, -0.4), 1.4) + circle(110, 44, 1.2, shade(c.secondary, -0.45)) + circle(110, 49, 1.2, shade(c.secondary, -0.45));
      return s + eye(96, 38, 2.4, c.accent) + gloss(54, 30, 18, 4, 0.5, -6);
    }, { roles: { primary: 'Body', secondary: 'Snout / hooves', accent: 'Eye' } }),
  or('dog', 'Dog (beagle)', ['dog', 'beagle', 'canine', 'large animal model', 'toxicology', 'veterinary'], { primary: '#d9a066', secondary: '#ffffff', accent: '#3a2a20' },
    (c, u) => {
      let s = limb('M20 36 Q12 24 14 14', c.primary, 4) + limb('M14 14 q0 -3 1 -5', c.secondary, 4);
      s += limb('M30 54 V74 M42 56 V76 M78 56 V76 M90 54 V74', c.secondary, 6);
      s += fur(u, 'b', smooth([[20, 40], [30, 30], [60, 28], [86, 30], [96, 42], [90, 58], [60, 60], [30, 58]]), c.primary);
      s += path(smooth([[30, 32], [56, 30], [80, 32], [70, 42], [44, 42]]), c.accent, 'none', 0, ' opacity="0.75"');
      s += fur(u, 'h', smooth([[86, 30], [92, 16], [104, 12], [114, 20], [118, 30], [110, 36], [98, 38]]), c.primary);
      s += path(smooth([[96, 18], [92, 34], [96, 42], [100, 30]]), shade(c.primary, -0.25), shade(c.primary, -0.45), 1.2);
      s += path('M110 22 Q118 28 118 32 L110 34Z', c.secondary, 'none', 0, ' opacity="0.9"');
      return s + eye(106, 20, 2.4, c.accent) + circle(119, 30, 2, '#1f2933') + gloss(56, 36, 14, 3, 0.45, -4);
    }, { roles: { primary: 'Tan coat', secondary: 'White markings', accent: 'Saddle / eye' } }),
  or('sheep', 'Sheep', ['sheep', 'ovine', 'lamb', 'large animal model', 'antiserum'], { primary: '#f4f1ea', secondary: '#3a3a40', accent: '#1f2933' },
    (c, u) => {
      let s = limb('M34 56 V74 M46 58 V76 M74 58 V76 M86 56 V74', c.secondary, 4.6);
      let wool = '';
      [[30, 40, 12], [44, 30, 12], [60, 28, 13], [76, 30, 12], [88, 40, 11], [80, 52, 12], [62, 56, 13], [42, 54, 12], [28, 50, 10], [56, 42, 16]].forEach(([x, y, r]) => { wool += `<circle cx="${x}" cy="${y}" r="${r}"/>`; });
      const g = sphere(u, 'w', c.primary, { cx: 40, cy: 26, hi: 0.4 });
      s += `<g fill="none" stroke="${shade(c.primary, -0.38)}" stroke-width="4">${wool}</g>` + defs(g) + `<g fill="${g.url}">${wool}</g>`;
      s += speckle(58, 42, 28, 14, 30, 1.6, shade(c.primary, -0.12), 4, 0.8);
      s += path(smooth([[88, 34], [98, 26], [112, 30], [116, 42], [106, 50], [94, 46]]), c.secondary, shade(c.secondary, -0.4), 1.4) + ellipse(94, 28, 7, 3, c.secondary, shade(c.secondary, -0.4), 1, ' transform="rotate(-30 94 28)"');
      return s + eye(104, 36, 2.2, '#f2c94c') + gloss(46, 26, 12, 4, 0.5, -10);
    }, { roles: { primary: 'Wool', secondary: 'Face / legs', accent: 'Eye' } }),
  or('chicken', 'Chicken', ['chicken', 'gallus gallus', 'avian', 'egg', 'chick embryo', 'bird', 'igy'], { primary: '#f6f0e4', secondary: '#e05252', accent: '#f2b134' },
    (c, u) => {
      let s = limb('M44 76 V92 l-6 4 M44 92 l6 4 M58 76 V92 l-6 4 M58 92 l6 4', c.accent, 2.6);
      [[18, 30, -40], [14, 44, -60], [20, 22, -20]].forEach(([x, y, a], i) => { s += `<g transform="rotate(${a} ${x} ${y})">${fur(u, `t${i}`, smooth([[x - 4, y + 14], [x - 6, y], [x, y - 14], [x + 6, y], [x + 4, y + 14]]), shade(c.primary, -0.08))}</g>`; });
      s += fur(u, 'b', smooth([[20, 50], [30, 36], [56, 34], [70, 40], [76, 56], [66, 74], [44, 80], [26, 70]]), c.primary);
      s += fur(u, 'h', smooth([[64, 42], [62, 26], [70, 14], [82, 14], [88, 24], [84, 36], [76, 46]]), c.primary);
      s += path('M68 14 q2 -8 6 -4 q2 -6 6 -2 q4 -4 6 2 q2 4 -4 6 Z', c.secondary, shade(c.secondary, -0.4), 1);
      s += path('M86 22 L96 26 L86 30 Z', c.accent, shade(c.accent, -0.4), 1) + path(smooth([[84, 32], [88, 34], [86, 42], [82, 38]]), c.secondary, shade(c.secondary, -0.4), 0.8);
      s += path(smooth([[34, 52], [52, 46], [62, 56], [50, 66], [36, 62]]), shade(c.primary, -0.06), shade(c.primary, -0.38), 1.2);
      return s + eye(78, 22, 2.2) + gloss(44, 42, 10, 4, 0.5, -10);
    }, { w: 100, h: 100, size: 90, roles: { primary: 'Feathers', secondary: 'Comb / wattle', accent: 'Beak / legs' } }),
  or('xenopus', 'Frog (Xenopus)', ['xenopus', 'frog', 'xenopus laevis', 'amphibian', 'oocyte injection', 'developmental biology'], { primary: '#9bb86a', secondary: '#f2e6b0', accent: '#2f3a20' },
    (c, u) => {
      let s = fur(u, 'l', smooth([[50, 54], [74, 48], [96, 58], [80, 64], [62, 70], [90, 72], [98, 76], [70, 78], [46, 70]]), shade(c.primary, -0.06));
      s += fur(u, 'b', smooth([[10, 44], [20, 28], [44, 22], [70, 28], [80, 42], [72, 56], [44, 60], [20, 56]]), c.primary);
      s += path(smooth([[16, 50], [40, 56], [64, 52], [44, 60], [22, 58]]), c.secondary, 'none', 0, ' opacity="0.8"');
      s += limb('M30 56 Q26 66 18 70 M18 70 l-4 2 M18 70 l-2 4', c.primary, 4) + speckle(46, 36, 20, 8, 10, 1.6, shade(c.primary, -0.2), 4, 0.7);
      return s + circle(24, 28, 5, light(c.primary, 0.2), shade(c.primary, -0.4), 1.2) + eye(24, 28, 2.6, c.accent) + gloss(42, 30, 14, 3, 0.5, -6);
    }, { w: 110, h: 84, roles: { primary: 'Skin', secondary: 'Belly', accent: 'Eye' } }),
  or('c-elegans', 'C. elegans', ['c. elegans', 'caenorhabditis elegans', 'nematode', 'worm', 'model organism', 'aging'], { primary: '#e8dcc0', secondary: '#c9a050', accent: '#8e7cc3' },
    (c, u) => {
      const pts = [[4, 30], [20, 22], [40, 24], [60, 32], [80, 34], [100, 28], [116, 26]];
      const body = taper(pts, 10, 1.4);
      let s = `<path d="${body}" fill="none" stroke="${shade(c.primary, -0.42)}" stroke-width="3.4"/>` + path(body, c.primary);
      s += `<path d="${smoothOpen(pts.slice(1, -1))}" fill="none" stroke="${c.secondary}" stroke-width="2.6" opacity="0.7"/>` + ellipse(22, 22.6, 4, 2.6, c.secondary, shade(c.secondary, -0.4), 0.8);
      [[50, 28], [56, 30], [62, 31], [68, 33], [74, 33]].forEach(([x, y]) => { s += ellipse(x, y + 1.6, 2.4, 1.6, c.accent, shade(c.accent, -0.4), 0.5); });
      return s + `<path d="${smoothOpen(pts)}" fill="none" stroke="#fff" stroke-width="1" opacity="0.6" transform="translate(0 -2.4)"/>`;
    }, { w: 120, h: 50, roles: { primary: 'Body', secondary: 'Pharynx / intestine', accent: 'Eggs' } }),
  or('llama', 'Llama / alpaca', ['llama', 'alpaca', 'camelid', 'nanobody', 'vhh', 'immunization', 'heavy-chain antibodies'], { primary: '#f0e2c8', secondary: '#c9a070', accent: '#1f2933' },
    (c, u) => {
      let s = limb('M32 64 V94 M44 66 V96 M70 66 V96 M82 64 V94', shade(c.primary, -0.08), 5.4) + limb('M28 52 q-6 2 -8 8', c.primary, 5);
      s += fur(u, 'b', smooth([[26, 56], [32, 44], [56, 40], [84, 42], [92, 54], [86, 70], [56, 72], [32, 70]]), c.primary);
      s += fur(u, 'n', smooth([[78, 46], [80, 22], [84, 12], [96, 10], [104, 16], [102, 22], [92, 24], [90, 48]]), c.primary);
      s += path('M86 12 l-2 -10 l5 8 Z M92 10 l2 -10 l2 10 Z', shade(c.primary, -0.05), shade(c.primary, -0.42), 1.2);
      let woolL = '';
      for (let i = 0; i < 8; i++) woolL += `M${36 + i * 6} 48 q2 3 0 6 `;
      s += `<path d="${woolL}" fill="none" stroke="${c.secondary}" stroke-width="1.2" opacity="0.7"/>`;
      return s + eye(94, 15, 2.2, c.accent) + circle(104, 19, 1.4, c.accent) + gloss(52, 46, 14, 3, 0.45, -4);
    }, { w: 110, h: 100, size: 100, roles: { primary: 'Wool', secondary: 'Texture', accent: 'Eye' } }),
  or('hamster', 'Hamster', ['hamster', 'syrian hamster', 'golden hamster', 'rodent', 'covid model', 'animal model'], { primary: '#e8b07a', secondary: '#f6e6d0', accent: '#1f2933' },
    (c, u) => {
      let s = limb('M40 60 l-2 6 M52 62 l0 6 M74 62 l2 6 M84 58 l3 6', '#f4a6b4', 2.6);
      s += fur(u, 'b', smooth([[18, 46], [26, 28], [50, 18], [76, 20], [94, 30], [100, 44], [92, 58], [64, 66], [32, 62]]), c.primary);
      s += path(smooth([[34, 56], [60, 52], [88, 50], [80, 62], [52, 66]]), c.secondary, 'none', 0, ' opacity="0.9"') + path(smooth([[80, 38], [92, 40], [94, 52], [82, 52]]), c.secondary, 'none', 0, ' opacity="0.85"');
      s += circle(72, 20, 5, light(c.primary, 0.1), shade(c.primary, -0.4), 1.2) + circle(72, 20, 2.8, '#f4a6b4');
      return s + eye(86, 30, 2.6, c.accent) + circle(99, 40, 1.8, '#f4a6b4') + gloss(44, 28, 14, 4, 0.5, -10);
    }, { w: 110, h: 76, roles: { primary: 'Fur', secondary: 'Belly / cheeks', accent: 'Eye' } }),
  or('macaque', 'Macaque (non-human primate)', ['macaque', 'rhesus', 'cynomolgus', 'nhp', 'non-human primate', 'monkey', 'primate'], { primary: '#b89a76', secondary: '#f2b8a8', accent: '#3a2a20' },
    (c, u) => {
      let s = limb('M30 84 Q10 86 8 70 Q6 56 16 50', c.primary, 4.4);
      s += fur(u, 'b', smooth([[30, 50], [40, 36], [60, 34], [72, 46], [76, 70], [68, 90], [40, 92], [28, 76]]), c.primary);
      s += limb('M60 52 Q74 64 70 80', shade(c.primary, -0.05), 7) + fur(u, 'l', smooth([[34, 74], [52, 70], [66, 82], [62, 94], [36, 94]]), shade(c.primary, -0.05));
      s += fur(u, 'h', blob(56, 24, 16, 15, { n: 10, seed: 3, wobble: 0.05 }), c.primary) + circle(42, 24, 4, c.secondary, shade(c.secondary, -0.4), 1);
      s += path(smooth([[50, 16], [64, 14], [70, 24], [66, 34], [56, 36], [50, 28]]), c.secondary, shade(c.secondary, -0.4), 1);
      return s + eye(58, 22, 1.8, c.accent) + eye(65, 22, 1.8, c.accent) + `<path d="M58 30 q3 2 6 0" fill="none" stroke="${shade(c.secondary, -0.45)}" stroke-width="1"/>` + gloss(48, 44, 8, 4, 0.45, -20);
    }, { w: 90, h: 100, size: 90, roles: { primary: 'Fur', secondary: 'Face', accent: 'Eyes' } }),
  or('ferret', 'Ferret', ['ferret', 'mustela', 'influenza model', 'respiratory virus', 'animal model'], { primary: '#e9dcc6', secondary: '#5a4a3a', accent: '#1f2933' },
    (c, u) => {
      let s = tail([[18, 40], [8, 36], [2, 30]], c.secondary, 6, 2.6) + limb('M30 46 l-2 8 M40 48 l0 8 M84 46 l2 8 M92 44 l3 7', c.secondary, 4);
      s += fur(u, 'b', smooth([[16, 40], [26, 30], [60, 28], [92, 26], [108, 30], [116, 38], [106, 44], [80, 46], [40, 48], [22, 46]]), c.primary);
      s += path(smooth([[98, 30], [108, 30], [114, 36], [104, 38]]), c.secondary, 'none', 0, ' opacity="0.8"') + circle(100, 26, 3.6, c.primary, shade(c.primary, -0.4), 1.2);
      return s + eye(106, 33, 1.8, c.accent) + circle(117, 38, 1.6, '#f4a6b4') + gloss(56, 32, 16, 2.4, 0.45, -3);
    }, { w: 120, h: 60, roles: { primary: 'Fur', secondary: 'Mask / legs', accent: 'Eye' } }),
  or('mosquito', 'Mosquito', ['mosquito', 'aedes', 'anopheles', 'vector', 'malaria vector', 'dengue', 'insect'], { primary: '#7b6a5a', secondary: '#c9e2f2', accent: '#3a2a20' },
    (c, u) => {
      let s = `<g fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-linecap="round"><path d="M56 40 L40 56 L30 74 M60 42 L56 60 L54 78 M64 40 L76 58 L90 70 M58 38 L46 50 L30 54 M62 38 L74 46 L96 44 M60 40 L66 56 L70 76"/></g>`;
      [[44, 24, -30], [56, 22, -10]].forEach(([x, y, a]) => { s += ellipse(x, y, 16, 5, c.secondary, shade(c.secondary, -0.3), 0.8, ` opacity="0.75" transform="rotate(${a} ${x} ${y})"`); });
      const ab = smooth([[60, 36], [40, 36], [20, 30], [8, 26], [10, 22], [24, 26], [44, 32]]);
      s += fur(u, 'a', ab, c.primary, { sw: 1.4 }) + `<g stroke="${shade(c.primary, 0.4)}" stroke-width="1.2" opacity="0.7"><path d="M18 26 l1 4 M26 28 l1 4 M34 30 l1 4 M42 32 l1 3"/></g>`;
      s += fur(u, 't', blob(64, 34, 7, 6, { n: 8, seed: 3 }), c.primary, { sw: 1.4 }) + fur(u, 'h', blob(74, 34, 4, 4, { n: 7, seed: 5 }), c.primary, { sw: 1.2 });
      return s + line(77, 36, 100, 46, c.accent, 1.4) + `<path d="M76 31 q6 -6 12 -4 M76 32 q6 -2 10 2" fill="none" stroke="${c.accent}" stroke-width="0.9"/>` + circle(75, 33, 1.6, '#c0303a');
    }, { w: 110, h: 84, size: 90, roles: { primary: 'Body', secondary: 'Wings', accent: 'Legs' } }),
  or('tick', 'Tick', ['tick', 'ixodes', 'lyme vector', 'arachnid', 'vector', 'borrelia'], { primary: '#8a4a2a', secondary: '#3a2418', accent: '#c96a3a' },
    (c, u) => {
      let s = `<g fill="none" stroke="${c.secondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`;
      [-1, 1].forEach((k) => { [30, 42, 54, 66].forEach((y, i) => { const x0 = 50 + k * 18, x1 = 50 + k * (34 + (i % 2) * 4), x2 = 50 + k * (44 - i * 2); s += `<path d="M${x0} ${y} L${x1} ${y - 8 + i * 4} L${x2} ${y + 6 + i * 4}"/>`; }); });
      s += '</g>';
      s += fur(u, 'b', smooth([[50, 22], [66, 28], [72, 50], [66, 76], [50, 86], [34, 76], [28, 50], [34, 28]]), c.primary) + path(smooth([[40, 26], [50, 22], [60, 26], [58, 40], [50, 44], [42, 40]]), c.secondary, 'none', 0, ' opacity="0.85"');
      return s + path('M44 22 L50 8 L56 22 Z', c.accent, shade(c.accent, -0.4), 1) + gloss(42, 52, 6, 10, 0.4, 10);
    }, { w: 100, h: 100, size: 80, roles: { primary: 'Body', secondary: 'Scutum / legs', accent: 'Mouthparts' } }),
  or('arabidopsis', 'Arabidopsis (plant)', ['arabidopsis', 'arabidopsis thaliana', 'plant', 'model plant', 'rosette', 'botany'], { primary: '#5fa04a', secondary: '#7fb35a', accent: '#f6f2e6' },
    (c, u) => {
      let s = limb('M40 84 Q38 50 44 10 M42 50 Q52 40 60 26 M41 64 Q30 52 24 38', c.secondary, 2);
      [[44, 10], [60, 26], [24, 38], [48, 6], [40, 8]].forEach(([x, y]) => { s += [0, 72, 144, 216, 288].map((a) => ellipse(x + Math.cos((a * Math.PI) / 180) * 2.4, y + Math.sin((a * Math.PI) / 180) * 2.4, 2, 1.4, c.accent, shade(c.accent, -0.3), 0.5)).join('') + circle(x, y, 1, '#f2c94c'); });
      [[52, 36, 30], [32, 52, -30]].forEach(([x, y, a]) => { s += ellipse(x, y, 7, 1.4, c.secondary, shade(c.secondary, -0.4), 0.6, ` transform="rotate(${a} ${x} ${y})"`); });
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, x = 40 + Math.cos(a) * 18, y = 86 + Math.sin(a) * 7;
        s += `<g transform="rotate(${n((a * 180) / Math.PI)} 40 86)">${fur(u, `lf${i}`, smooth([[42, 86], [52, 82], [62, 84], [60, 90], [50, 90]]), i % 2 ? c.primary : shade(c.primary, 0.1), { hi: 0.3, sw: 1.2 })}</g>`;
      }
      return s;
    }, { w: 80, h: 100, size: 80, roles: { primary: 'Leaves', secondary: 'Stems', accent: 'Flowers' } }),
];
