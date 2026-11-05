// More organs, tissues and microanatomy.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, smooth, smoothOpen, blob, ring, speckle, rim, membrane, granules, vesicle, nucleusDetail, linear } from './kit.js';
import { organ, tube } from './lab.js';
import { poly, pack, lipid, round } from './cellkit.js';

const R3 = { primary: 'Main', secondary: 'Secondary', accent: 'Accent' };
const an = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Organs & tissues', tags, colors, roles: R3, draw, size: 100, ...extra });
const mi = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Microanatomy', tags, colors, roles: R3, draw, size: 110, ...extra });
const RED = '#e05252', BLUE = '#4a7fd6';
const cellDot = (x, y, r, col) => circle(x, y, r, col, dark(col, 0.4), n(r * 0.2)) + circle(x - r * 0.3, y - r * 0.32, r * 0.32, '#fff', 'none', 0, ' opacity="0.55"');
const rbc = (x, y, r = 3.4, rot = 0) => `<g transform="rotate(${rot} ${x} ${y})">${ellipse(x, y, r, r * 0.7, RED, dark(RED, 0.4), 0.7)}${ellipse(x, y - 0.3, r * 0.5, r * 0.3, dark(RED, 0.15), 'none', 0, ' opacity="0.6"')}</g>`;

export const anatomy2 = [
  an('stomach', 'Stomach', ['stomach', 'gastric', 'digestion', 'gi tract', 'rugae', 'h. pylori'], { primary: '#f0a08a', secondary: '#c9654d', accent: '#f8d0c0' },
    (c, u) => {
      let s = tube('M38 2 Q37 10 39 18', c.secondary, 9) + tube('M30 74 Q18 78 12 94', c.secondary, 9);
      const d = smooth([[32, 14], [44, 14], [50, 24], [64, 22], [80, 28], [92, 46], [88, 68], [72, 84], [50, 88], [32, 84], [24, 72], [34, 62], [50, 62], [62, 52], [58, 40], [44, 36], [32, 30]]);
      s += organ(u, 'b', d, c.primary);
      s += `<path d="M56 32 Q74 40 76 60 M50 40 Q66 50 64 70 M40 70 Q56 74 70 66" fill="none" stroke="${dark(c.primary, 0.15)}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>`;
      return s + gloss(66, 34, 10, 4, 0.5, 30);
    }),
  an('pancreas', 'Pancreas', ['pancreas', 'pancreatic', 'islets', 'exocrine', 'endocrine', 'pdac', 'diabetes'], { primary: '#f2c87a', secondary: '#c98a2b', accent: '#e85d75' },
    (c, u) => {
      const d = smooth([[6, 44], [20, 36], [40, 34], [60, 32], [78, 26], [94, 32], [98, 50], [88, 64], [72, 62], [54, 54], [32, 54], [12, 54]]);
      let s = organ(u, 'b', d, c.primary) + `<path d="M12 46 Q40 44 60 42 Q80 40 88 52" fill="none" stroke="${c.secondary}" stroke-width="1.8" opacity="0.8"/>`;
      const R = rng(5);
      let lob = '';
      for (let i = 0; i < 26; i++) lob += `<circle cx="${n(12 + R() * 80)}" cy="${n(38 + R() * 16)}" r="${n(1.6 + R() * 1.4)}"/>`;
      s += `<g fill="${dark(c.primary, 0.12)}" opacity="0.6">${lob}</g>` + [[30, 46], [56, 40], [78, 46]].map(([x, y]) => cellDot(x, y, 2.4, c.accent)).join('');
      return s + gloss(40, 38, 14, 2.4, 0.5, -5);
    }, { w: 100, h: 80, roles: { primary: 'Pancreas', secondary: 'Duct', accent: 'Islets' } }),
  an('gallbladder', 'Gallbladder & bile ducts', ['gallbladder', 'bile', 'biliary', 'bile duct', 'cholecystitis', 'gallstones'], { primary: '#7fb35a', secondary: '#4f8a3a', accent: '#f2c94c' },
    (c, u) => {
      let s = tube('M50 30 Q52 14 66 10 M66 10 Q74 18 76 32 V96 M66 10 Q78 6 90 8', c.secondary, 4);
      const d = smooth([[40, 92], [26, 76], [22, 54], [30, 38], [44, 30], [58, 34], [64, 52], [60, 74], [50, 92]]);
      return s + organ(u, 'b', d, c.primary) + circle(36, 72, 4, c.accent, dark(c.accent, 0.4), 0.8) + circle(46, 78, 3, c.accent, dark(c.accent, 0.4), 0.8) + gloss(34, 44, 5, 8, 0.5, 20);
    }, { roles: { primary: 'Gallbladder', secondary: 'Ducts', accent: 'Gallstones' } }),
  an('colon', 'Large intestine (colon)', ['colon', 'large intestine', 'cecum', 'rectum', 'appendix', 'colorectal', 'ibd', 'haustra'], { primary: '#e8a07a', secondary: '#c9653d', accent: '#f8d0b0' },
    (c) => {
      const d = 'M22 86 V24 Q22 14 32 14 H70 Q80 14 80 24 V70 Q80 80 70 84 Q60 88 58 80 Q56 72 48 76 V98';
      let s = tube(d, c.primary, 15) + `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.22)}" stroke-width="15" stroke-dasharray="1.4 7" opacity="0.55"/>`;
      s += `<path d="${d}" fill="none" stroke="${light(c.primary, 0.4)}" stroke-width="3" opacity="0.6" transform="translate(-2.4 -2.4)"/>`;
      return s + tube('M22 92 Q18 98 14 96', c.secondary, 4);
    }, { roles: { primary: 'Colon', secondary: 'Appendix', accent: 'Accent' } }),
  an('bladder', 'Urinary bladder', ['bladder', 'urinary bladder', 'urothelium', 'ureter', 'urethra', 'urology'], { primary: '#f2c46a', secondary: '#d9a040', accent: '#f6e8b0' },
    (c, u) => tube('M22 4 Q24 20 34 30 M78 4 Q76 20 66 30', '#e8a07a', 5) + tube('M50 84 V98', '#e8a07a', 6)
      + organ(u, 'b', smooth([[50, 22], [74, 28], [86, 50], [76, 74], [56, 86], [44, 86], [24, 74], [14, 50], [26, 28]]), c.primary) + `<path d="M28 50 Q50 40 72 50" fill="none" stroke="${c.secondary}" stroke-width="1.4" opacity="0.6"/>` + gloss(36, 36, 9, 5, 0.5, -20),
    { roles: { primary: 'Bladder', secondary: 'Wall', accent: 'Accent' } }),
  an('uterus', 'Uterus & ovaries', ['uterus', 'ovary', 'ovaries', 'fallopian tube', 'female reproductive', 'endometrium', 'cervix'], { primary: '#f2a0b4', secondary: '#c95f86', accent: '#f6e2a8' },
    (c, u) => {
      let s = tube('M38 30 Q24 22 14 30 Q8 36 12 44 M62 30 Q76 22 86 30 Q92 36 88 44', c.primary, 5);
      s += `<path d="M10 44 l-4 4 M12 46 l-2 6 M14 45 l2 6 M90 44 l4 4 M88 46 l2 6 M86 45 l-2 6" stroke="${dark(c.primary, 0.3)}" stroke-width="2" stroke-linecap="round"/>`;
      [[22, 52], [78, 52]].forEach(([x, y], i) => { s += organ(u, `o${i}`, blob(x, y, 9, 6.4, { n: 8, seed: i + 3 }), light(c.primary, 0.2)) + circle(x - 2, y, 2.4, c.accent, dark(c.accent, 0.4), 0.6) + circle(x + 3, y + 1.4, 1.6, c.accent, dark(c.accent, 0.4), 0.5); });
      s += organ(u, 'b', smooth([[30, 26], [50, 20], [70, 26], [66, 50], [56, 68], [56, 90], [44, 90], [44, 68], [34, 50]]), c.primary);
      return s + path(smooth([[40, 32], [50, 28], [60, 32], [56, 46], [50, 56], [44, 46]]), c.secondary, 'none', 0, ' opacity="0.45"') + gloss(42, 30, 6, 3, 0.5, -15);
    }, { roles: { primary: 'Uterus', secondary: 'Endometrium', accent: 'Follicles' } }),
  an('testis', 'Testis', ['testis', 'testes', 'testicle', 'epididymis', 'seminiferous tubules', 'male reproductive', 'spermatogenesis'], { primary: '#f2c4b0', secondary: '#c97a6a', accent: '#8fa8e0' },
    (c, u) => {
      let s = tube('M70 20 Q78 8 70 2', c.secondary, 4);
      s += organ(u, 'b', smooth([[50, 22], [70, 30], [76, 56], [66, 82], [46, 90], [28, 80], [22, 56], [30, 32]]), c.primary);
      let tub = '';
      for (let i = 0; i < 6; i++) tub += `M${30 + i * 2} ${40 + i * 7} q8 -6 14 0 t14 0 t10 0 `;
      s += `<path d="${tub}" fill="none" stroke="${dark(c.primary, 0.15)}" stroke-width="1.6" opacity="0.6"/>`;
      s += path(smooth([[66, 24], [76, 30], [80, 52], [76, 78], [68, 86], [70, 60], [70, 34]]), c.secondary, dark(c.secondary, 0.42), 1.4);
      return s + gloss(38, 36, 7, 4, 0.5, -30);
    }, { roles: { primary: 'Testis', secondary: 'Epididymis', accent: 'Accent' } }),
  an('prostate', 'Prostate', ['prostate', 'prostate gland', 'psa', 'male reproductive', 'prostate cancer', 'bph'], { primary: '#e8a090', secondary: '#f2c46a', accent: '#c96a5a' },
    (c, u) => organ(u, 'bl', smooth([[50, 4], [70, 8], [76, 22], [64, 32], [36, 32], [24, 22], [30, 8]]), c.secondary) + organ(u, 'b', smooth([[50, 30], [72, 34], [82, 52], [70, 74], [50, 80], [30, 74], [18, 52], [28, 34]]), c.primary)
      + tube('M50 34 V98', '#f6e2a8', 4, { hi: false }) + `<path d="M34 46 Q42 56 40 68 M66 46 Q58 56 60 68" fill="none" stroke="${c.accent}" stroke-width="1.4" opacity="0.6"/>` + gloss(36, 42, 6, 4, 0.5, -30),
    { roles: { primary: 'Prostate', secondary: 'Bladder', accent: 'Lobes' } }),
  an('placenta', 'Placenta', ['placenta', 'umbilical cord', 'pregnancy', 'trophoblast', 'maternal-fetal interface', 'chorionic villi'], { primary: '#c9536e', secondary: '#4a7fd6', accent: '#e85d5d' },
    (c, u) => {
      let s = organ(u, 'b', smooth([[8, 60], [16, 40], [40, 30], [64, 30], [88, 40], [94, 60], [80, 72], [50, 76], [20, 72]]), c.primary);
      s += `<path d="M24 52 Q34 44 46 50 M54 48 Q66 40 78 50 M32 62 Q50 56 68 62" fill="none" stroke="${dark(c.primary, 0.2)}" stroke-width="1.4" opacity="0.7"/>`;
      const cord = 'M50 46 C40 32 62 22 52 12 C46 6 52 2 58 0';
      return s + tube(cord, c.secondary, 4) + `<path d="${cord}" fill="none" stroke="${c.accent}" stroke-width="2" stroke-dasharray="3 3" transform="translate(2 0)"/>` + gloss(32, 38, 12, 3, 0.45, -10);
    }, { roles: { primary: 'Placenta', secondary: 'Umbilical vein', accent: 'Umbilical arteries' } }),
  an('breast', 'Breast (mammary gland)', ['breast', 'mammary gland', 'lobules', 'ducts', 'lactation', 'breast cancer'], { primary: '#f4c9a8', secondary: '#e8899a', accent: '#f6e2a8' },
    (c, u) => {
      let s = organ(u, 'b', 'M10 6 C70 6 94 40 92 62 C90 80 76 92 58 92 C40 92 20 84 10 70 Z', c.primary, { sw: 1.6 });
      s += path('M14 30 C30 34 40 50 36 70 C32 82 22 84 14 78 Z', c.accent, 'none', 0, ' opacity="0.55"');
      const duct = 'M88 66 Q70 60 56 50 Q48 44 40 30 M70 62 Q60 70 46 74 M60 54 Q54 40 56 24 M78 64 Q70 76 62 84';
      s += `<path d="${duct}" fill="none" stroke="${c.secondary}" stroke-width="2" stroke-linecap="round"/>`;
      [[40, 28], [56, 22], [44, 74], [62, 86], [34, 46]].forEach(([x, y]) => { s += [[0, 0], [-4, -3], [4, -3], [0, -6], [-3, 3]].map(([dx, dy]) => cellDot(x + dx, y + dy, 2.4, c.secondary)).join(''); });
      return s + ellipse(92, 64, 3, 5, dark(c.secondary, 0.1), dark(c.secondary, 0.4), 1);
    }, { roles: { primary: 'Tissue', secondary: 'Ducts & lobules', accent: 'Fat' } }),
  an('thyroid', 'Thyroid gland', ['thyroid', 'thyroid gland', 'thyroxine', 't3', 't4', 'hypothyroidism', 'goiter'], { primary: '#c9536e', secondary: '#d9e2ec', accent: '#f2b84b' },
    (c, u) => {
      let s = rect(40, 0, 20, 100, 6, c.secondary, dark(c.secondary, 0.35), 1.4);
      for (let y = 6; y < 100; y += 9) s += `<path d="M41 ${y} Q50 ${y + 3} 59 ${y}" fill="none" stroke="${dark(c.secondary, 0.25)}" stroke-width="2.2"/>`;
      s += organ(u, 'b', smooth([[30, 22], [42, 28], [44, 52], [56, 52], [58, 28], [70, 22], [82, 40], [80, 70], [68, 80], [58, 66], [42, 66], [32, 80], [20, 70], [18, 40]]), c.primary);
      return s + gloss(26, 38, 4, 8, 0.45, 10) + gloss(74, 38, 4, 8, 0.4, -10);
    }, { roles: { primary: 'Thyroid', secondary: 'Trachea', accent: 'Accent' } }),
  an('adrenal-gland', 'Adrenal gland', ['adrenal', 'adrenal gland', 'suprarenal', 'cortisol', 'adrenaline', 'adrenal cortex', 'adrenal medulla'], { primary: '#f2b84b', secondary: '#b5523b', accent: '#c96a3a' },
    (c, u) => organ(u, 'k', smooth([[30, 52], [52, 44], [74, 50], [84, 70], [74, 92], [52, 98], [36, 92], [28, 78], [40, 72], [32, 62]]), c.secondary)
      + organ(u, 'b', smooth([[24, 50], [40, 24], [56, 10], [70, 26], [82, 48], [60, 50], [40, 54]]), c.primary) + path(smooth([[44, 44], [52, 30], [62, 40], [56, 48]]), c.accent, 'none', 0, ' opacity="0.55"') + gloss(48, 26, 5, 3, 0.5, -40),
    { roles: { primary: 'Adrenal gland', secondary: 'Kidney', accent: 'Medulla' } }),
  an('pituitary-gland', 'Pituitary gland', ['pituitary', 'hypophysis', 'hypothalamus', 'anterior pituitary', 'posterior pituitary', 'endocrine'], { primary: '#f2b8c6', secondary: '#c95f86', accent: '#e8a0c0' },
    (c, u) => organ(u, 'h', 'M4 4 H96 Q96 30 70 34 Q56 36 54 44 H46 Q44 36 30 34 Q4 30 4 4Z', light(c.primary, 0.25)) + tube('M50 40 V58', c.secondary, 7)
      + organ(u, 'a', smooth([[30, 62], [46, 56], [50, 70], [46, 90], [30, 92], [20, 78]]), c.secondary) + organ(u, 'p', smooth([[52, 58], [66, 58], [78, 72], [72, 90], [54, 88], [52, 72]]), c.accent),
    { roles: { primary: 'Hypothalamus', secondary: 'Anterior lobe', accent: 'Posterior lobe' } }),
  an('eye', 'Eye (cross-section)', ['eye', 'eyeball', 'retina', 'lens', 'cornea', 'optic nerve', 'ophthalmology'], { primary: '#f4f1ec', secondary: '#4a7fd6', accent: '#e05252' },
    (c, u) => {
      let s = tube('M86 50 Q94 52 100 58', '#f2d0a0', 9);
      const g = sphere(u, 'b', c.primary, { hi: 0.3, lo: -0.15 });
      s += defs(g) + circle(50, 50, 40, g.url, dark(c.primary, 0.4), 2) + `<path d="M50 10 A40 40 0 0 1 90 50 A40 40 0 0 1 50 90" fill="none" stroke="${c.accent}" stroke-width="3" opacity="0.7"/>`;
      s += path('M14 30 Q2 50 14 70', light(c.secondary, 0.6), dark(c.secondary, 0.2), 1.2, ' opacity="0.7"');
      s += rect(15, 30, 5, 13, 2, c.secondary, dark(c.secondary, 0.4), 1) + rect(15, 57, 5, 13, 2, c.secondary, dark(c.secondary, 0.4), 1);
      s += ellipse(26, 50, 7, 12, '#f6f0dc', dark('#e0d0a0', 0.3), 1.2) + gloss(24, 44, 2, 4, 0.6, 0);
      return s + circle(86, 50, 3, '#f2d0a0', dark('#f2d0a0', 0.4), 1);
    }, { roles: { primary: 'Sclera', secondary: 'Iris / cornea', accent: 'Retina' } }),
  an('ear', 'Ear', ['ear', 'auricle', 'hearing', 'otology', 'pinna', 'cochlea'], { primary: '#f4c9a8', secondary: '#d99a7a', accent: '#c97a5a' },
    (c, u) => organ(u, 'b', smooth([[40, 6], [64, 6], [80, 22], [82, 44], [70, 62], [60, 76], [56, 92], [42, 96], [34, 84], [40, 70], [30, 62], [24, 40], [26, 20]]), c.primary)
      + `<path d="M40 22 Q60 14 68 30 Q72 46 58 54 Q48 60 50 72" fill="none" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/><path d="M46 36 Q56 32 58 42 Q56 48 48 48" fill="none" stroke="${c.secondary}" stroke-width="2.6" stroke-linecap="round"/>` + gloss(48, 14, 8, 3, 0.45, -10),
    { roles: { primary: 'Ear', secondary: 'Concha', accent: 'Helix fold' } }),
  an('tooth', 'Tooth', ['tooth', 'molar', 'enamel', 'dentin', 'pulp', 'dental', 'root canal'], { primary: '#f6f2e6', secondary: '#f2d9a6', accent: '#e8899a' },
    (c, u) => {
      const outer = smooth([[16, 30], [20, 10], [36, 8], [50, 14], [64, 8], [80, 10], [84, 30], [80, 52], [72, 92], [62, 94], [56, 62], [44, 62], [38, 94], [28, 92], [20, 52]]);
      let s = organ(u, 'b', outer, c.primary, { hi: 0.25 });
      s += path(smooth([[24, 34], [28, 20], [50, 24], [72, 20], [76, 34], [72, 52], [66, 84], [60, 60], [40, 60], [34, 84], [28, 52]]), c.secondary, dark(c.secondary, 0.25), 1);
      return s + path(smooth([[38, 34], [50, 30], [62, 34], [60, 46], [56, 56], [44, 56], [40, 46]]), c.accent, dark(c.accent, 0.3), 1) + gloss(30, 16, 8, 3, 0.6, -10);
    }, { roles: { primary: 'Enamel', secondary: 'Dentin', accent: 'Pulp' } }),
  an('knee-joint', 'Knee joint', ['knee', 'joint', 'synovial joint', 'cartilage', 'meniscus', 'osteoarthritis', 'arthritis'], { primary: '#f2ead2', secondary: '#a9d0f0', accent: '#e8899a' },
    (c, u) => {
      let s = path('M8 50 Q4 30 14 22 L22 4 H78 L86 22 Q96 30 92 50 Q50 60 8 50Z', 'none', c.accent, 3, ' opacity="0.5"');
      s += organ(u, 'f', 'M30 0 H70 V30 Q84 34 84 46 Q70 54 50 50 Q30 54 16 46 Q16 34 30 30 Z', c.primary, { hi: 0.25 });
      s += organ(u, 't', 'M18 64 Q50 58 82 64 V74 Q70 78 66 84 V100 H34 V84 Q30 78 18 74 Z', c.primary, { hi: 0.25 });
      s += `<path d="M18 46 Q50 56 82 46" fill="none" stroke="${c.secondary}" stroke-width="4" stroke-linecap="round"/><path d="M20 63 Q50 58 80 63" fill="none" stroke="${c.secondary}" stroke-width="4" stroke-linecap="round"/>`;
      return s + ellipse(26, 58, 8, 3, '#f6f0dc', '#c9b48a', 1) + ellipse(74, 58, 8, 3, '#f6f0dc', '#c9b48a', 1);
    }, { roles: { primary: 'Bone', secondary: 'Cartilage', accent: 'Synovium' } }),
  an('skeletal-muscle', 'Skeletal muscle', ['skeletal muscle', 'muscle', 'biceps', 'fascicles', 'tendon', 'myopathy'], { primary: '#d9534f', secondary: '#f2ead2', accent: '#f2a0a0' },
    (c, u) => {
      let s = tube('M4 50 H20 M100 50 H116', c.secondary, 7);
      s += organ(u, 'b', smooth([[18, 50], [36, 30], [60, 24], [84, 30], [102, 50], [84, 70], [60, 76], [36, 70]]), c.primary);
      s += `<path d="M26 46 Q60 30 94 46 M26 54 Q60 70 94 54 M30 50 H90" fill="none" stroke="${dark(c.primary, 0.2)}" stroke-width="1.2" opacity="0.6"/>`;
      return s + gloss(52, 34, 14, 3, 0.5, -5);
    }, { w: 120, h: 100, roles: { primary: 'Muscle', secondary: 'Tendon', accent: 'Accent' } }),
  an('long-bone', 'Long bone (femur)', ['bone', 'femur', 'long bone', 'skeleton', 'osteoporosis', 'fracture'], { primary: '#f2ead2', secondary: '#c9b48a', accent: '#f2ead2' },
    (c, u) => organ(u, 'b', 'M30 4 C18 2 12 14 20 22 C24 26 34 26 38 32 L42 64 C40 70 30 72 26 80 C22 92 36 98 46 94 C50 92 54 92 58 94 C68 98 78 90 72 80 C68 72 60 70 58 64 L62 32 C66 26 76 26 80 22 C88 14 82 2 70 4 C62 6 56 8 50 8 C44 8 38 6 30 4Z', c.primary, { hi: 0.3, sw: 1.8 })
      + `<path d="M48 30 V66" stroke="${c.secondary}" stroke-width="2" opacity="0.4"/>` + gloss(28, 10, 8, 3, 0.55, -10), { roles: { primary: 'Bone', secondary: 'Detail', accent: 'Accent' } }),
  an('spinal-cord', 'Spinal cord (cross-section)', ['spinal cord', 'cns', 'gray matter', 'white matter', 'dorsal horn', 'spinal injury', 'als'], { primary: '#f6ecd8', secondary: '#c9a0b4', accent: '#f2c46a' },
    (c, u) => {
      let s = tube('M6 30 Q14 34 22 40 M94 30 Q86 34 78 40 M6 70 Q14 66 22 60 M94 70 Q86 66 78 60', c.accent, 4);
      s += organ(u, 'b', smooth([[50, 14], [76, 22], [86, 50], [76, 78], [50, 86], [24, 78], [14, 50], [24, 22]]), c.primary, { hi: 0.25 });
      s += path('M50 44 C58 34 66 20 70 28 C72 36 62 44 60 50 C64 56 74 66 68 74 C62 78 56 62 50 56 C44 62 38 78 32 74 C26 66 36 56 40 50 C38 44 28 36 30 28 C34 20 42 34 50 44Z', c.secondary, dark(c.secondary, 0.3), 1);
      return s + circle(50, 50, 2, dark(c.secondary, 0.4)) + gloss(36, 28, 8, 3, 0.45, -25);
    }, { roles: { primary: 'White matter', secondary: 'Gray matter', accent: 'Nerve roots' } }),
  an('nerve', 'Peripheral nerve (cross-section)', ['nerve', 'peripheral nerve', 'fascicle', 'epineurium', 'axons', 'neuropathy'], { primary: '#f6e2a8', secondary: '#e8b0a0', accent: '#e05252' },
    (c, u) => {
      let s = organ(u, 'b', blob(50, 50, 44, 40, { n: 12, wobble: 0.04, seed: 3 }), c.primary, { hi: 0.25 });
      [[34, 38, 14], [64, 36, 12], [40, 66, 12], [68, 64, 11]].forEach(([x, y, r], i) => { s += circle(x, y, r, c.secondary, dark(c.secondary, 0.35), 1.6) + speckle(x, y, r * 0.75, r * 0.75, Math.round(r * 1.4), 1.1, light(c.primary, 0.3), i + 3, 1); });
      return s + circle(52, 50, 3, c.accent, dark(c.accent, 0.4), 0.8) + circle(22, 56, 2.4, c.accent, dark(c.accent, 0.4), 0.8);
    }, { roles: { primary: 'Epineurium', secondary: 'Fascicles', accent: 'Blood vessels' } }),
  an('artery', 'Artery (cross-section)', ['artery', 'arterial wall', 'tunica media', 'intima', 'atherosclerosis', 'vascular'], { primary: '#e8899a', secondary: '#d9534f', accent: '#f6e2c8' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { hi: 0.3 });
      let s = defs(g) + circle(50, 50, 44, g.url, dark(c.primary, 0.42), 1.6) + circle(50, 50, 34, c.secondary, dark(c.secondary, 0.4), 1);
      for (let r = 26; r < 34; r += 2.4) s += circle(50, 50, r, 'none', light(c.secondary, 0.25), 0.8, ' opacity="0.7"');
      s += circle(50, 50, 24, c.accent, dark(c.accent, 0.3), 1.6) + circle(50, 50, 21, '#fbeaea', 'none');
      return s + rbc(44, 46, 4, 20) + rbc(56, 54, 4, -30) + rbc(50, 40, 3.6, 0) + gloss(30, 20, 12, 4, 0.4, -40);
    }, { roles: { primary: 'Adventitia', secondary: 'Media', accent: 'Intima' } }),
  an('vein', 'Vein with valve', ['vein', 'venous valve', 'venous return', 'varicose', 'dvt', 'vascular'], { primary: '#4a7fd6', secondary: '#a8c4ee', accent: '#f6f2e6' },
    (c, u) => {
      const g = linear(u, 'w', light(c.primary, 0.2), dark(c.primary, 0.2));
      let s = defs(g) + rect(16, 2, 68, 96, 10, c.secondary, dark(c.primary, 0.42), 2) + rect(16, 2, 8, 96, 4, g.url) + rect(76, 2, 8, 96, 4, g.url);
      s += path('M24 50 Q38 36 48 30 L48 34 Q40 44 26 56Z', c.accent, dark(c.accent, 0.35), 1) + path('M76 50 Q62 36 52 30 L52 34 Q60 44 74 56Z', c.accent, dark(c.accent, 0.35), 1);
      return s + rbc(50, 76, 4, 20) + rbc(40, 64, 4, -10) + rbc(58, 14, 4, 30) + `<path d="M50 96 V84 l-4 4 M50 84 l4 4" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="2" stroke-linecap="round"/>`;
    }, { roles: { primary: 'Wall', secondary: 'Lumen', accent: 'Valve' } }),
  an('capillary-bed', 'Capillary bed', ['capillary', 'capillaries', 'microcirculation', 'arteriole', 'venule', 'perfusion'], { primary: RED, secondary: BLUE, accent: '#b07ac0' },
    (c) => {
      let s = '';
      const cap = ['M20 20 Q40 30 50 50 Q60 70 80 80', 'M20 20 Q50 20 60 40 Q66 56 80 80', 'M20 20 Q24 44 40 60 Q56 76 80 80', 'M34 26 Q46 40 40 60', 'M56 30 Q52 50 66 66'];
      cap.forEach((d) => { s += `<path d="${d}" fill="none" stroke="${dark(c.accent, 0.3)}" stroke-width="4.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${c.accent}" stroke-width="2.6" stroke-linecap="round"/>`; });
      return s + tube('M2 6 Q12 12 20 20', c.primary, 8) + tube('M80 80 Q90 88 98 96', c.secondary, 9);
    }, { roles: { primary: 'Arteriole', secondary: 'Venule', accent: 'Capillaries' } }),
  an('lymphatic-vessel', 'Lymphatic vessel', ['lymphatic vessel', 'lymphatics', 'lymph', 'lymphatic valve', 'lymphedema', 'drainage'], { primary: '#9fd6b0', secondary: '#e6f5ea', accent: '#5aa7e6' },
    (c, u) => {
      let s = path('M14 4 Q8 22 16 34 Q6 50 16 66 Q8 82 14 96 H86 Q92 82 84 66 Q94 50 84 34 Q92 22 86 4 Z', c.secondary, dark(c.primary, 0.42), 2);
      [34, 66].forEach((y) => { s += path(`M16 ${y} Q34 ${y - 8} 48 ${y - 14} L48 ${y - 10} Q36 ${y - 2} 20 ${y + 6}Z`, c.primary, dark(c.primary, 0.35), 1) + path(`M84 ${y} Q66 ${y - 8} 52 ${y - 14} L52 ${y - 10} Q64 ${y - 2} 80 ${y + 6}Z`, c.primary, dark(c.primary, 0.35), 1); });
      return s + [[36, 82], [60, 86], [44, 46], [62, 50], [50, 16]].map(([x, y], i) => { const g = sphere(u, `l${i}`, c.accent, { hi: 0.45 }); return defs(g) + circle(x, y, 5, g.url, dark(c.accent, 0.42), 1) + circle(x + 0.4, y + 0.4, 3.4, dark(c.accent, 0.25), 'none', 0, ' opacity="0.8"'); }).join('');
    }, { roles: { primary: 'Valves / wall', secondary: 'Lymph', accent: 'Leukocytes' } }),
  an('airways', 'Airways (trachea & bronchi)', ['trachea', 'bronchi', 'bronchial tree', 'airway', 'bronchioles', 'asthma', 'copd'], { primary: '#f2a7b3', secondary: '#f6e2e6', accent: '#c4537a' },
    (c) => {
      const tree = 'M50 4 V40 M50 40 Q36 46 30 58 M50 40 Q64 46 70 58 M30 58 Q20 64 16 78 M30 58 Q34 70 32 84 M70 58 Q80 64 84 78 M70 58 Q66 70 68 84 M16 78 L10 90 M16 78 L20 92 M84 78 L90 90 M84 78 L80 92';
      let s = tube(tree, c.primary, 6);
      for (let y = 6; y < 38; y += 4.6) s += `<path d="M44.6 ${y} Q50 ${y + 2} 55.4 ${y}" fill="none" stroke="${c.secondary}" stroke-width="2.2" stroke-linecap="round"/>`;
      return s + tube('M50 4 V40', c.primary, 10) + Array.from({ length: 8 }, (_, i) => `<path d="M44.6 ${6 + i * 4.4} Q50 ${8 + i * 4.4} 55.4 ${6 + i * 4.4}" fill="none" stroke="${c.secondary}" stroke-width="2" stroke-linecap="round"/>`).join('');
    }, { roles: { primary: 'Airways', secondary: 'Cartilage rings', accent: 'Accent' } }),
  an('blood-sample', 'Blood (drop)', ['blood', 'blood drop', 'whole blood', 'blood sample', 'pbmc', 'hematology', 'leukocytes'], { primary: '#d94848', secondary: '#f6f2e6', accent: '#8e7cc3' },
    (c, u) => {
      const d = 'M50 4 C62 26 84 44 84 64 C84 84 68 96 50 96 C32 96 16 84 16 64 C16 44 38 26 50 4Z';
      let s = organ(u, 'b', d, c.primary, { hi: 0.45 });
      s += rbc(38, 60, 6, 20).replace(new RegExp(RED, 'g'), light(c.primary, 0.15)) + rbc(60, 70, 6, -20).replace(new RegExp(RED, 'g'), light(c.primary, 0.15)) + rbc(52, 50, 5, 10).replace(new RegExp(RED, 'g'), light(c.primary, 0.15));
      const wg = sphere(u, 'w', c.secondary, { hi: 0.3 });
      s += defs(wg) + circle(40, 80, 7, wg.url, dark(c.secondary, 0.35), 1) + circle(41, 81, 4.6, c.accent, 'none', 0, ' opacity="0.85"') + cellDot(66, 54, 1.8, '#ebb3c9') + cellDot(62, 84, 1.6, '#ebb3c9');
      return s + gloss(38, 30, 4, 10, 0.6, 20);
    }, { roles: { primary: 'Plasma / red cells', secondary: 'White cell', accent: 'Nucleus' } }),
  an('adipose-tissue', 'Adipose tissue', ['adipose tissue', 'fat', 'white adipose', 'adipocytes', 'obesity', 'fat depot'], { primary: '#f6e2a8', secondary: '#c9a050', accent: '#e05252' },
    (c) => {
      let s = rect(2, 2, 96, 96, 10, dark(c.primary, 0.1), dark(c.secondary, 0.3), 1.2);
      const cells = pack({ ...round(50, 50, 48, 48), pts: [[2, 2], [98, 2], [98, 98], [2, 98]], cx: 50, cy: 50, rx: 48, ry: 48 }, [], 14, { rmin: 8, rmax: 20, seed: 3, margin: 0.6, gap: 1.2 });
      cells.forEach((p) => { s += lipid(p.x, p.y, p.r, c.primary) + circle(p.x + p.r * 0.6, p.y + p.r * 0.62, 1.8, c.secondary, dark(c.secondary, 0.4), 0.5); });
      return s + `<path d="M4 70 Q30 64 50 74 T96 66" fill="none" stroke="${dark(c.accent, 0.3)}" stroke-width="3.4"/><path d="M4 70 Q30 64 50 74 T96 66" fill="none" stroke="${c.accent}" stroke-width="2"/>`;
    }, { roles: { primary: 'Lipid', secondary: 'Nuclei', accent: 'Capillary' } }),
  an('human-body-organs', 'Human body with organs', ['human body', 'anatomy', 'organs', 'torso', 'whole body', 'systemic', 'biodistribution'], { primary: '#e6d6c8', secondary: '#f2a7b3', accent: '#d9534f' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 35, cy: 20, r: 90, hi: 0.3 });
      const body = 'M50 2 C58 2 62 8 62 14 C62 20 58 24 56 26 L74 30 C80 32 82 36 84 44 L90 70 L84 72 L76 46 L74 58 L72 96 L58 96 L54 66 L50 66 L46 66 L42 96 L28 96 L26 58 L24 46 L16 72 L10 70 L16 44 C18 36 20 32 26 30 L44 26 C42 24 38 20 38 14 C38 8 42 2 50 2Z';
      let s = defs(g) + path(body, g.url, dark(c.primary, 0.3), 1.4);
      s += path(smooth([[44, 30], [48, 34], [46, 44], [38, 48], [36, 38]]), c.secondary, dark(c.secondary, 0.35), 0.8) + path(smooth([[56, 30], [52, 34], [54, 44], [62, 48], [64, 38]]), c.secondary, dark(c.secondary, 0.35), 0.8);
      s += path(smooth([[48, 36], [54, 36], [54, 42], [50, 44]]), c.accent, dark(c.accent, 0.4), 0.8);
      s += path(smooth([[34, 48], [48, 46], [50, 52], [40, 54]]), '#a8553a', dark('#a8553a', 0.4), 0.8) + path(smooth([[52, 48], [62, 48], [62, 54], [54, 54]]), '#f0a08a', dark('#f0a08a', 0.4), 0.8);
      return s + `<path d="M40 56 q4 -2 8 0 t8 0 t6 0 M40 60 q4 2 8 0 t8 0 t6 0" fill="none" stroke="#e8a07a" stroke-width="2.4" stroke-linecap="round"/>`;
    }, { roles: { primary: 'Body', secondary: 'Lungs', accent: 'Heart' } }),

  // ---- microanatomy -----------------------------------------------------------------------------
  mi('nephron', 'Nephron', ['nephron', 'glomerulus', 'proximal tubule', 'loop of henle', 'distal tubule', 'collecting duct', 'kidney'], { primary: '#f2c46a', secondary: '#e05252', accent: '#9fcbf0' },
    (c, u) => {
      const t = 'M30 26 Q44 30 46 22 Q48 12 58 18 Q66 24 56 30 Q46 36 52 44 V86 Q56 96 62 86 V50 Q64 38 74 40 Q84 44 78 52 Q72 58 82 60 Q90 60 92 50 V96';
      let s = tube(t, c.primary, 5);
      s += circle(22, 24, 12, light(c.accent, 0.4), dark(c.accent, 0.42), 1.6) + `<path d="M16 20 q3 -4 6 0 t6 0 M14 26 q3 4 6 0 t6 0 t4 0" fill="none" stroke="${c.secondary}" stroke-width="2.2" stroke-linecap="round"/>`;
      return s + tube('M2 16 Q8 18 12 22', c.secondary, 3) + tube('M2 32 Q8 30 12 28', dark(c.secondary, 0.1), 2.6);
    }, { roles: { primary: 'Tubule', secondary: 'Capillaries', accent: 'Bowman capsule' } }),
  mi('glomerulus', 'Glomerulus', ['glomerulus', 'bowman capsule', 'filtration', 'podocytes', 'gfr', 'glomerulonephritis', 'kidney'], { primary: '#9fcbf0', secondary: '#e05252', accent: '#f2c46a' },
    (c, u) => {
      const g = sphere(u, 'c', c.primary, { hi: 0.45 });
      let s = tube('M2 30 Q16 34 28 42', c.secondary, 6) + tube('M2 56 Q16 54 28 50', dark(c.secondary, 0.15), 5) + tube('M50 94 Q50 86 54 80', c.accent, 6);
      s += defs(g) + circle(54, 48, 38, g.url, dark(c.primary, 0.42), 2) + circle(54, 48, 31, '#f6fbff', dark(c.primary, 0.2), 1);
      const loops = 'M30 46 C30 24 52 22 54 34 C56 22 78 24 76 40 C88 46 80 64 68 60 C70 74 50 76 48 64 C36 72 26 60 34 52 Z';
      s += `<path d="${loops}" fill="none" stroke="${dark(c.secondary, 0.35)}" stroke-width="8"/><path d="${loops}" fill="none" stroke="${c.secondary}" stroke-width="5.6"/><path d="${loops}" fill="none" stroke="${light(c.secondary, 0.4)}" stroke-width="1.4" transform="translate(-0.6 -1)"/>`;
      return s + `<path d="M40 40 Q54 46 66 40 M44 56 Q56 50 66 56" fill="none" stroke="${dark(c.secondary, 0.35)}" stroke-width="5"/><path d="M40 40 Q54 46 66 40 M44 56 Q56 50 66 56" fill="none" stroke="${c.secondary}" stroke-width="3"/>`;
    }, { roles: { primary: 'Bowman capsule', secondary: 'Capillary tuft', accent: 'Proximal tubule' } }),
  mi('intestinal-villus', 'Intestinal villus & crypt', ['villus', 'villi', 'crypt', 'intestinal epithelium', 'lacteal', 'small intestine', 'crypt-villus axis'], { primary: '#f4c7a4', secondary: '#6d4a9b', accent: '#e05252' },
    (c, u) => {
      let s = organ(u, 'b', 'M30 98 V40 Q30 6 50 6 Q70 6 70 40 V98 Z', c.primary, { hi: 0.3 });
      s += path('M38 96 V40 Q38 16 50 16 Q62 16 62 40 V96 Z', light(c.primary, 0.3), 'none', 0, ' opacity="0.8"');
      let nuc = '';
      for (let y = 28; y < 94; y += 7) nuc += ellipse(33.6, y, 1.8, 2.8, c.secondary, 'none', 0, ' opacity="0.8"') + ellipse(66.4, y, 1.8, 2.8, c.secondary, 'none', 0, ' opacity="0.8"');
      for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; nuc += ellipse(50 + Math.cos(a) * 16.4, 26 + Math.sin(a) * 16.4, 1.8, 2.8, c.secondary, 'none', 0, ` opacity="0.8" transform="rotate(${n((a * 180) / Math.PI + 90)} ${n(50 + Math.cos(a) * 16.4)} ${n(26 + Math.sin(a) * 16.4)})"`); }
      s += nuc + tube('M44 96 V36 Q44 26 50 26 Q56 26 56 36 V96', c.accent, 1.8, { hi: false }) + tube('M50 96 V34', '#f6f2e6', 3, { hi: false });
      s += tube('M2 96 Q10 70 18 96', c.primary, 4) + tube('M82 96 Q90 70 98 96', c.primary, 4);
      return s + gloss(42, 16, 4, 6, 0.45, -10);
    }, { roles: { primary: 'Epithelium', secondary: 'Nuclei', accent: 'Capillaries' } }),
  mi('liver-lobule', 'Liver lobule', ['liver lobule', 'hepatic lobule', 'central vein', 'portal triad', 'sinusoids', 'hepatocyte plates', 'zonation'], { primary: '#c46a5a', secondary: BLUE, accent: '#7fb35a' },
    (c, u) => {
      const hex = Array.from({ length: 6 }, (_, i) => [50 + Math.cos(((i * 60 - 90) * Math.PI) / 180) * 46, 50 + Math.sin(((i * 60 - 90) * Math.PI) / 180) * 46]);
      let s = organ(u, 'b', `M${hex.map((p) => p.map(n).join(' ')).join(' L')}Z`, c.primary, { hi: 0.3 });
      for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; s += line(50 + Math.cos(a) * 9, 50 + Math.sin(a) * 9, 50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, light(c.primary, 0.35), 2.2, ' opacity="0.7"'); }
      s += circle(50, 50, 8, c.secondary, dark(c.secondary, 0.4), 1.4);
      hex.forEach(([x, y]) => { s += circle(x - 2.6, y, 3, RED, dark(RED, 0.4), 0.7) + circle(x + 2.6, y + 1, 3.4, c.secondary, dark(c.secondary, 0.4), 0.7) + circle(x, y - 3.6, 2.2, c.accent, dark(c.accent, 0.4), 0.7); });
      return s;
    }, { roles: { primary: 'Hepatocyte plates', secondary: 'Veins', accent: 'Bile ducts' } }),
  mi('pancreatic-islet', 'Pancreatic islet', ['islet', 'islet of langerhans', 'beta cells', 'alpha cells', 'endocrine pancreas', 'diabetes'], { primary: '#a9d4ea', secondary: '#f3c6a5', accent: '#c7e3b6' },
    (c, u) => {
      let s = rect(2, 2, 96, 96, 10, '#d9c8ef', dark('#d9c8ef', 0.35), 1.2);
      [[16, 16], [84, 16], [16, 84], [84, 84], [50, 6], [94, 50], [6, 50], [50, 94]].forEach(([x, y]) => { s += circle(x, y, 9, '#c9b8ea', dark('#c9b8ea', 0.35), 1) + speckle(x, y, 5, 5, 6, 1.2, '#f2a23c', x + y, 1); });
      s += organ(u, 'is', blob(50, 50, 32, 30, { n: 12, seed: 4, wobble: 0.06 }), light(c.primary, 0.3));
      const cells = pack({ ...round(50, 50, 30, 28, { seed: 4 }) }, [], 22, { rmin: 3.4, rmax: 5.4, seed: 6, margin: 0.4, gap: 0.3 });
      cells.forEach((p, i) => { const col = i % 5 === 1 ? c.secondary : i % 7 === 3 ? c.accent : c.primary; s += circle(p.x, p.y, p.r, col, dark(col, 0.35), 0.7) + circle(p.x + 0.3, p.y + 0.3, p.r * 0.38, dark(col, 0.45), 'none', 0, ' opacity="0.8"'); });
      return s + tube('M20 60 Q40 50 50 56 T80 40', RED, 2, { hi: false });
    }, { roles: { primary: 'β cells', secondary: 'α cells', accent: 'δ cells' } }),
  mi('alveoli', 'Alveoli', ['alveoli', 'alveolus', 'gas exchange', 'acinus', 'pneumocytes', 'lung', 'emphysema'], { primary: '#f2a7b3', secondary: RED, accent: BLUE },
    (c, u) => {
      let s = tube('M50 2 V30', c.primary, 8);
      [[50, 50, 15], [30, 46, 13], [70, 46, 13], [36, 70, 14], [64, 70, 14], [50, 84, 12], [22, 66, 11], [78, 66, 11], [50, 28, 10]].forEach(([x, y, r], i) => { const g = sphere(u, `a${i}`, c.primary, { hi: 0.5 }); s += defs(g) + circle(x, y, r, g.url, dark(c.primary, 0.42), 1.4) + circle(x + r * 0.15, y + r * 0.15, r * 0.6, dark(c.primary, 0.1), 'none', 0, ' opacity="0.35"'); });
      return s + `<path d="M14 58 Q30 40 50 44 Q70 40 86 58 M20 78 Q36 60 50 70 Q64 60 80 78" fill="none" stroke="${c.secondary}" stroke-width="1.6" opacity="0.8"/><path d="M18 64 Q34 52 50 58 Q66 52 82 64" fill="none" stroke="${c.accent}" stroke-width="1.6" opacity="0.8"/>`;
    }, { roles: { primary: 'Alveoli', secondary: 'Arterial capillaries', accent: 'Venous capillaries' } }),
  mi('hair-follicle', 'Hair follicle', ['hair follicle', 'hair', 'sebaceous gland', 'dermal papilla', 'skin appendage', 'alopecia'], { primary: '#f4c9a8', secondary: '#5a3a20', accent: '#f6e2a8' },
    (c, u) => {
      let s = rect(2, 14, 96, 84, 6, light(c.primary, 0.2), dark(c.primary, 0.3), 1.2) + rect(2, 14, 96, 12, 4, dark(c.primary, 0.08), dark(c.primary, 0.3), 1.2);
      s += organ(u, 'f', 'M42 26 V70 Q34 76 36 86 Q42 96 50 96 Q58 96 64 86 Q66 76 58 70 V26 Z', c.primary, { hi: 0.25 });
      s += organ(u, 's', blob(70, 46, 10, 8, { n: 8, seed: 4 }), c.accent) + `<path d="M62 46 H58" stroke="${dark(c.accent, 0.3)}" stroke-width="2"/>`;
      s += path('M48 2 L52 2 L54 86 Q50 90 46 86 Z', c.secondary, dark(c.secondary, 0.3), 1) + ellipse(50, 88, 5, 4, '#e8899a', dark('#e8899a', 0.4), 1);
      return s;
    }, { roles: { primary: 'Skin / follicle', secondary: 'Hair', accent: 'Sebaceous gland' } }),
  mi('osteon', 'Osteon (Haversian system)', ['osteon', 'haversian system', 'cortical bone', 'lamellae', 'osteocytes', 'bone histology'], { primary: '#f2ead2', secondary: '#c9b48a', accent: RED },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { hi: 0.25 });
      let s = defs(g) + circle(50, 50, 44, g.url, dark(c.secondary, 0.3), 1.6);
      for (let r = 12; r < 44; r += 5.4) s += circle(50, 50, r, 'none', c.secondary, 1, ' opacity="0.8"');
      ring(50, 50, 22, 22, 8, 0.2).concat(ring(50, 50, 33, 33, 12, 0.1)).forEach((p) => { s += ellipse(p.x, p.y, 2.4, 1.2, dark(c.secondary, 0.25), 'none', 0, ` transform="rotate(${n((p.a * 180) / Math.PI + 90)} ${n(p.x)} ${n(p.y)})"`); });
      return s + circle(50, 50, 7, '#fbe9e0', dark(c.secondary, 0.35), 1.2) + circle(48, 50, 2, c.accent) + circle(53, 49, 1.8, BLUE);
    }, { roles: { primary: 'Bone', secondary: 'Lamellae', accent: 'Artery' } }),
  mi('tumor-microenvironment', 'Tumor microenvironment', ['tumor microenvironment', 'tme', 'tumor immune', 'infiltrating lymphocytes', 'til', 'stroma', 'cold tumor', 'hot tumor'], { primary: '#c47bc0', secondary: '#62a8ea', accent: '#e7a66c' },
    (c, u) => {
      let s = tube('M2 80 Q30 70 50 86 T98 76', RED, 5) + `<path d="M4 20 C30 10 50 30 96 14 M6 40 C30 30 60 50 94 36" fill="none" stroke="#e8a0b4" stroke-width="2" opacity="0.6"/>`;
      [[40, 46, 13], [58, 40, 12], [52, 60, 12], [70, 56, 11], [34, 64, 10], [62, 24, 9]].forEach(([x, y, r], i) => { const g = sphere(u, `t${i}`, c.primary, { hi: 0.4 }); s += defs(g) + path(blob(x, y, r, r * 0.92, { n: 8, seed: i + 3, wobble: 0.12 }), g.url, dark(c.primary, 0.42), 1.2) + circle(x + 1, y, r * 0.45, dark(c.primary, 0.35), 'none', 0, ' opacity="0.8"'); });
      [[16, 30], [86, 46], [24, 56], [80, 22], [88, 66]].forEach(([x, y], i) => { const g = sphere(u, `l${i}`, c.secondary, { hi: 0.45 }); s += defs(g) + circle(x, y, 6, g.url, dark(c.secondary, 0.42), 1) + circle(x + 0.5, y + 0.5, 4, dark(c.secondary, 0.3), 'none', 0, ' opacity="0.8"'); });
      const mg = sphere(u, 'm', c.accent, { hi: 0.4 });
      return s + defs(mg) + path(blob(14, 12, 10, 8, { n: 9, seed: 7, wobble: 0.2 }), mg.url, dark(c.accent, 0.42), 1.2) + path(blob(84, 88, 10, 8, { n: 9, seed: 9, wobble: 0.2 }), mg.url, dark(c.accent, 0.42), 1.2);
    }, { roles: { primary: 'Tumor cells', secondary: 'T cells', accent: 'Macrophages' } }),
];
