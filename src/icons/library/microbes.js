// More viruses, bacteria, fungi, protists and other pathogens.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, smooth, smoothOpen, blob, ring, speckle, rim, membrane, nucleusDetail, domain, vesicle } from './kit.js';
import { spikes, capsid } from './bio.js';
import { round, outline } from './cellkit.js';

const pa = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Pathogens', tags, colors, roles: { primary: 'Main', secondary: 'Secondary', accent: 'Accent' }, draw, size: 100, shape: 'ellipse', ...extra });

/** Shaded microbe body: gradient, cytoplasm texture, inner shadow, double envelope and sheen. */
function microbe(u, key, d, c, box, { tex = 30, env = true, sw = 2.2 } = {}) {
  const g = sphere(u, key, c, { cx: 38, cy: 28, r: 85 });
  let s = defs(g) + path(d, g.url) + speckle(box.cx, box.cy, box.rx * 0.8, box.ry * 0.8, tex, 0.7, dark(c, 0.32), 3, 0.45) + rim(u, `${key}r`, d, c, { op: 0.3, from: 0.6 });
  s += `<path d="${d}" fill="none" stroke="${dark(c, 0.42)}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  if (env) s += `<path d="${d}" fill="none" stroke="${light(c, 0.4)}" stroke-width="0.9" opacity="0.7" transform="translate(${n(box.cx * 0.04)} ${n(box.cy * 0.04)}) scale(0.96)"/>`;
  return s;
}
/** Capsule-shaped rod path. */
const rodD = (x, y, w, h) => { const r = h / 2; return `M${n(x + r)} ${n(y)} H${n(x + w - r)} A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)} H${n(x + r)} A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`; };
const tubeLine = (d, col, w) => `<path d="${d}" fill="none" stroke="${dark(col, 0.4)}" stroke-width="${n(w + 2.2)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${light(col, 0.45)}" stroke-width="${n(w * 0.3)}" stroke-linecap="round" opacity="0.7" transform="translate(-0.4 -0.8)"/>`;
const flagellum = (d, col) => `<path d="${d}" fill="none" stroke="${dark(col, 0.25)}" stroke-width="1.8" stroke-linecap="round"/>`;
/** A coccus (small sphere) with a lit gradient. */
const coccus = (u, key, x, y, r, c) => { const g = sphere(u, key, c, { hi: 0.5 }); return defs(g) + circle(x, y, r, g.url, dark(c, 0.42), 1.4) + circle(x, y, r * 0.84, 'none', light(c, 0.35), 0.7, ' opacity="0.6"') + gloss(x - r * 0.35, y - r * 0.38, r * 0.3, r * 0.18, 0.55); };

export const microbes = [
  // ---- viruses ---------------------------------------------------------------------------------
  pa('coronavirus', 'Coronavirus (SARS-CoV-2)', ['coronavirus', 'sars-cov-2', 'covid-19', 'spike', 'betacoronavirus', 'mers', 'enveloped rna virus'], { primary: '#f2a0a0', secondary: '#e85d5d', accent: '#f6c945' },
    (c, u) => {
      let s = spikes(50, 50, 30, 18, 10, c.secondary, 5.6, 2.6, 0.1);
      const g = sphere(u, 'b', c.primary, { hi: 0.45 });
      s += defs(g) + circle(50, 50, 31, g.url, dark(c.primary, 0.42), 1.8);
      ring(50, 50, 22, 22, 9, 0.3).forEach((p, i) => { s += circle(p.x, p.y, i % 3 ? 1.8 : 2.4, i % 3 ? c.accent : dark(c.secondary, 0.1), dark(c.accent, 0.4), 0.5); });
      s += speckle(50, 50, 18, 18, 14, 1.2, light(c.secondary, 0.2), 4, 0.8);
      return s + gloss(38, 36, 9, 5, 0.5);
    }, { roles: { primary: 'Envelope', secondary: 'Spike proteins', accent: 'M / E proteins' } }),
  pa('influenza-virus', 'Influenza virus', ['influenza', 'flu', 'hemagglutinin', 'neuraminidase', 'ha', 'na', 'orthomyxovirus', 'segmented rna'], { primary: '#9fcbf0', secondary: '#4a8fe7', accent: '#e8724a' },
    (c, u) => {
      let s = '';
      ring(50, 50, 32, 30, 22, 0).forEach((p, i) => {
        const ox = Math.cos(p.a), oy = Math.sin(p.a), x2 = p.x + ox * 10, y2 = p.y + oy * 10;
        if (i % 4 === 3) s += line(p.x, p.y, x2, y2, dark(c.accent, 0.35), 2.2) + `<g transform="translate(${n(x2)} ${n(y2)}) rotate(${n((p.a * 180) / Math.PI)})"><rect x="-1" y="-4" width="5" height="8" rx="2" fill="${c.accent}" stroke="${dark(c.accent, 0.4)}" stroke-width="0.7"/></g>`;
        else s += line(p.x, p.y, x2 + ox * 2, y2 + oy * 2, dark(c.secondary, 0.35), 3.4) + line(p.x, p.y, x2 + ox * 2, y2 + oy * 2, c.secondary, 2);
      });
      const d = blob(50, 50, 33, 31, { n: 12, wobble: 0.04, seed: 5 });
      s += microbe(u, 'b', d, c.primary, { cx: 50, cy: 50, rx: 33, ry: 31 }, { tex: 10 });
      [[38, 40, 30], [50, 36, -10], [62, 42, 40], [36, 56, -40], [50, 52, 10], [64, 58, -20], [44, 66, 60], [58, 68, 20]].forEach(([x, y, a]) => { s += `<g transform="rotate(${a} ${x} ${y})">${rect(x - 7, y - 2.4, 14, 4.8, 2.4, light(c.secondary, 0.2), dark(c.secondary, 0.3), 0.8)}<path d="M${x - 5} ${y - 2} v4 M${x - 2} ${y - 2} v4 M${x + 1} ${y - 2} v4 M${x + 4} ${y - 2} v4" stroke="${dark(c.secondary, 0.2)}" stroke-width="0.6"/></g>`; });
      return s + gloss(36, 32, 10, 5, 0.5);
    }, { roles: { primary: 'Envelope', secondary: 'Hemagglutinin / RNPs', accent: 'Neuraminidase' } }),
  pa('adenovirus', 'Adenovirus', ['adenovirus', 'adenoviral vector', 'icosahedral', 'fiber knob', 'dsdna virus', 'vaccine vector', 'chadox'], { primary: '#7fc9b9', secondary: '#2a6b78', accent: '#f39a3d' },
    (c) => {
      let s = '';
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (Math.PI / 3) * i, x = 50 + Math.cos(a) * 34, y = 50 + Math.sin(a) * 34, x2 = 50 + Math.cos(a) * 46, y2 = 50 + Math.sin(a) * 46; s += line(x, y, x2, y2, dark(c.secondary, 0.2), 2.6) + line(x, y, x2, y2, light(c.secondary, 0.3), 1.2) + circle(x2, y2, 3.6, c.accent, dark(c.accent, 0.42), 1) + circle(x2 - 1.1, y2 - 1.2, 1.1, '#fff', 'none', 0, ' opacity="0.6"'); }
      return s + capsid(50, 50, 34, c.primary);
    }, { roles: { primary: 'Capsid', secondary: 'Fibers', accent: 'Fiber knobs' } }),
  pa('filovirus', 'Filovirus (e.g. Ebola)', ['ebola', 'filovirus', 'marburg', 'filamentous', 'hemorrhagic fever'], { primary: '#e8a0c0', secondary: '#a24b85', accent: '#f6c945' },
    (c) => {
      const d = 'M14 86 C10 50 18 20 48 14 C74 10 88 30 76 46 C66 58 48 50 52 38';
      return `<path d="${d}" fill="none" stroke="${c.secondary}" stroke-width="15" stroke-linecap="round" stroke-dasharray="1.2 3.2"/>` + tubeLine(d, c.primary, 10) + `<path d="${d}" fill="none" stroke="${c.secondary}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 2" opacity="0.6"/>`;
    }, { roles: { primary: 'Virion', secondary: 'Glycoprotein / nucleocapsid', accent: 'Accent' } }),
  pa('poxvirus', 'Poxvirus', ['poxvirus', 'vaccinia', 'mpox', 'smallpox', 'variola', 'brick-shaped', 'dsdna virus'], { primary: '#d9b48a', secondary: '#8a5a2b', accent: '#c95fc0' },
    (c, u) => {
      const d = 'M22 18 H78 Q92 18 92 32 V68 Q92 82 78 82 H22 Q8 82 8 68 V32 Q8 18 22 18Z';
      let s = microbe(u, 'b', d, c.primary, { cx: 50, cy: 50, rx: 40, ry: 30 }, { tex: 0 });
      let t = '';
      for (let y = 26; y < 78; y += 6) t += `M14 ${y} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 `;
      s += `<path d="${t}" fill="none" stroke="${dark(c.primary, 0.18)}" stroke-width="1.4" opacity="0.6"/>`;
      s += path('M30 36 Q50 46 70 36 Q78 50 70 64 Q50 54 30 64 Q22 50 30 36Z', c.secondary, dark(c.secondary, 0.4), 1.4) + ellipse(22, 50, 5, 9, c.accent, dark(c.accent, 0.4), 1) + ellipse(78, 50, 5, 9, c.accent, dark(c.accent, 0.4), 1);
      return s + gloss(30, 26, 14, 3, 0.5, -5);
    }, { roles: { primary: 'Outer membrane', secondary: 'Core', accent: 'Lateral bodies' } }),

  // ---- bacteria --------------------------------------------------------------------------------
  pa('bacterial-cell', 'Bacterial cell (anatomy)', ['bacterial cell', 'prokaryote', 'nucleoid', 'capsule', 'pili', 'flagellum', 'cell wall', 'plasmid'], { primary: '#a5d98f', secondary: '#2f7a3a', accent: '#f39a3d' },
    (c, u) => {
      let s = flagellum('M112 34 q6 -8 4 -14 t4 -12', c.secondary) + flagellum('M110 34 C116 34 118 46 112 52 S114 64 118 66', c.secondary);
      ring(60, 34, 50, 25, 26, 0.1).forEach((p) => { s += line(p.x, p.y, 60 + Math.cos(p.a) * 55, 34 + Math.sin(p.a) * 28, dark(c.primary, 0.35), 0.9); });
      s += path(rodD(6, 6, 108, 56), light(c.primary, 0.4), dark(c.primary, 0.3), 1, ' opacity="0.8"');
      const d = rodD(12, 11, 96, 46);
      s += microbe(u, 'b', d, c.primary, { cx: 60, cy: 34, rx: 44, ry: 20 }, { tex: 40 });
      s += `<path d="M34 34 q5 -10 10 -2 t10 2 t10 -3 t10 3 t8 -1 M38 40 q6 5 12 -1 t12 1 t12 0" fill="none" stroke="${c.secondary}" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>`;
      s += circle(88, 24, 6, 'none', c.accent, 2) + circle(26, 42, 4.4, 'none', c.accent, 1.8);
      return s + gloss(40, 18, 18, 3, 0.5, 0);
    }, { w: 124, h: 70, roles: { primary: 'Cytoplasm', secondary: 'Nucleoid / flagella', accent: 'Plasmids' } }),
  pa('spirochete', 'Spirochete', ['spirochete', 'borrelia', 'lyme disease', 'treponema', 'syphilis', 'leptospira', 'spiral bacteria'], { primary: '#c49be0', secondary: '#7a4fa8', accent: '#c49be0' },
    (c) => {
      const pts = Array.from({ length: 33 }, (_, i) => [6 + i * 3.4, 30 + Math.sin(i * 0.78) * 12]);
      return tubeLine(smoothOpen(pts), c.primary, 6) + `<path d="${smoothOpen(pts)}" fill="none" stroke="${c.secondary}" stroke-width="1" stroke-dasharray="2 3" opacity="0.7"/>`;
    }, { w: 120, h: 60, roles: { primary: 'Cell body', secondary: 'Axial filament', accent: 'Accent' } }),
  pa('vibrio', 'Vibrio (curved rod)', ['vibrio', 'cholera', 'vibrio cholerae', 'comma-shaped', 'curved rod', 'campylobacter'], { primary: '#7fc9b9', secondary: '#2a6b78', accent: '#9aa5b1' },
    (c, u) => {
      const d = 'M12 30 C12 14 40 8 62 16 C76 22 84 34 80 44 C78 50 70 50 66 44 C60 34 44 28 30 34 C22 40 12 40 12 30Z';
      return flagellum('M80 44 q10 6 16 2 t14 4 t8 6', c.accent) + microbe(u, 'b', d, c.primary, { cx: 46, cy: 30, rx: 32, ry: 14 }, { tex: 20 }) + gloss(34, 18, 12, 2.6, 0.5, -10);
    }, { w: 120, h: 60, roles: { primary: 'Cell body', secondary: 'Detail', accent: 'Flagellum' } }),
  pa('mycobacterium', 'Mycobacterium', ['mycobacterium', 'tuberculosis', 'mtb', 'acid-fast', 'bcg', 'waxy cell wall', 'mycolic acid'], { primary: '#e8a07a', secondary: '#a85a3a', accent: '#f6e2c8' },
    (c, u) => {
      let s = '';
      [[10, 14, 64, 14, -8], [28, 36, 70, 14, 6], [14, 58, 60, 13, -4]].forEach(([x, y, w, h, a], i) => {
        const d = rodD(x, y, w, h);
        s += `<g transform="rotate(${a} ${x + w / 2} ${y + h / 2})">` + path(d, 'none', c.accent, 5, ' opacity="0.8"') + microbe(u, `r${i}`, d, c.primary, { cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 }, { tex: 10, sw: 1.8 }) + gloss(x + w * 0.3, y + h * 0.3, w * 0.2, 1.4, 0.5, 0) + '</g>';
      });
      return s;
    }, { w: 110, h: 80, roles: { primary: 'Bacilli', secondary: 'Detail', accent: 'Waxy coat' } }),
  pa('streptococcus', 'Streptococcus (chain)', ['streptococcus', 'strep', 'chain of cocci', 'gram positive', 'pneumococcus', 'group a strep'], { primary: '#8e7cc3', secondary: '#5b4f9a', accent: '#c0b2f0' },
    (c, u) => [[10, 40], [24, 36], [38, 34], [52, 35], [66, 39], [80, 44], [94, 46], [108, 44]].map(([x, y], i) => coccus(u, `c${i}`, x, y, 7.4, c.primary)).join(''),
    { w: 120, h: 70, roles: { primary: 'Cocci', secondary: 'Detail', accent: 'Accent' } }),
  pa('diplococcus', 'Diplococci (e.g. Neisseria)', ['diplococcus', 'neisseria', 'gonorrhea', 'meningococcus', 'gram negative cocci', 'paired cocci'], { primary: '#e85d75', secondary: '#a83250', accent: '#f5a3b3' },
    (c, u) => [[28, 30, -20], [70, 64, 30], [72, 24, 70]].map(([x, y, a], i) => `<g transform="rotate(${a} ${x} ${y})">${microbe(u, `a${i}`, smooth([[x - 18, y], [x - 14, y - 11], [x - 5, y - 12], [x - 2, y], [x - 5, y + 12], [x - 14, y + 11]]), c.primary, { cx: x - 10, cy: y, rx: 8, ry: 11 }, { tex: 6, sw: 1.8 })}${microbe(u, `b${i}`, smooth([[x + 18, y], [x + 14, y - 11], [x + 5, y - 12], [x + 2, y], [x + 5, y + 12], [x + 14, y + 11]]), c.primary, { cx: x + 10, cy: y, rx: 8, ry: 11 }, { tex: 6, sw: 1.8 })}</g>`).join(''),
    { roles: { primary: 'Cocci', secondary: 'Detail', accent: 'Accent' } }),
  pa('bacterial-spore', 'Bacterial endospore', ['endospore', 'spore', 'bacillus', 'clostridium', 'c. difficile', 'anthrax', 'sporulation'], { primary: '#e9c46a', secondary: '#7a5a1c', accent: '#f6f0dc' },
    (c, u) => {
      const d = rodD(8, 14, 104, 36);
      let s = microbe(u, 'b', d, c.primary, { cx: 60, cy: 32, rx: 50, ry: 16 }, { tex: 24 });
      const sg = sphere(u, 's', c.accent, { hi: 0.4, lo: -0.2 });
      return s + defs(sg) + ellipse(84, 32, 18, 12, sg.url, dark(c.secondary, 0.1), 3) + ellipse(84, 32, 13, 8, 'none', dark(c.accent, 0.25), 1.2) + gloss(78, 26, 6, 2.4, 0.6, -10) + gloss(30, 20, 14, 2.4, 0.45, 0);
    }, { w: 120, h: 64, roles: { primary: 'Mother cell', secondary: 'Spore coat', accent: 'Spore' } }),
  pa('biofilm', 'Biofilm', ['biofilm', 'eps matrix', 'quorum sensing', 'pseudomonas', 'chronic infection', 'microbial community', 'device infection'], { primary: '#c9e3a8', secondary: '#4f9a3a', accent: '#c95fc0' },
    (c, u) => {
      const surf = sphere(u, 'surf', '#c9d1db', { cy: 10, hi: 0.3 });
      let s = defs(surf) + rect(2, 70, 116, 16, 3, surf.url, '#7b8794', 1.2);
      const m = sphere(u, 'm', c.primary, { cy: 20, hi: 0.35 });
      s += defs(m) + path('M4 70 C6 50 18 40 30 46 C36 24 58 18 66 36 C76 22 98 26 100 46 C110 46 116 58 116 70 Z', m.url, dark(c.primary, 0.35), 1.6, ' opacity="0.92"');
      const R = rng(7);
      for (let i = 0; i < 18; i++) {
        const x = 14 + R() * 94, y = 46 + R() * 20 - (Math.abs(x - 60) < 30 ? 10 : 0), a = R() * 180;
        s += i % 3 ? `<g transform="rotate(${n(a)} ${n(x)} ${n(y)})">${rect(x - 5, y - 2.2, 10, 4.4, 2.2, c.secondary, dark(c.secondary, 0.4), 0.7)}</g>` : circle(x, y, 2.6, c.accent, dark(c.accent, 0.4), 0.7);
      }
      return s + gloss(44, 32, 14, 3, 0.4, -10);
    }, { w: 120, h: 90, shape: 'rect', roles: { primary: 'EPS matrix', secondary: 'Rods', accent: 'Cocci' } }),

  // ---- fungi -----------------------------------------------------------------------------------
  pa('fungal-hyphae', 'Fungal hyphae (mold)', ['hyphae', 'mold', 'mycelium', 'filamentous fungus', 'septate', 'mucor', 'fungal'], { primary: '#e9d48a', secondary: '#9a7a2a', accent: '#7fb35a' },
    (c) => {
      const h = 'M4 80 Q30 70 50 52 Q66 38 92 30 M50 52 Q46 32 56 12 M70 40 Q86 50 110 54 M30 70 Q20 52 24 36';
      let s = tubeLine(h, c.primary, 6);
      [[24, 75], [42, 60], [62, 44], [80, 34], [52, 32], [88, 48], [100, 52]].forEach(([x, y]) => { s += line(x - 2, y - 3, x + 2, y + 3, dark(c.secondary, 0.1), 1.2); });
      [[92, 30], [56, 12], [110, 54], [24, 36]].forEach(([x, y], i) => { for (let k = 0; k < 4; k++) s += circle(x + (k + 1) * 4.6 * (i % 2 ? 0.4 : 1), y - (k + 1) * 4.6 * (i % 2 ? 1 : 0.3), 2.6, c.accent, dark(c.accent, 0.4), 0.7); });
      return s;
    }, { w: 120, h: 90, roles: { primary: 'Hyphae', secondary: 'Septa', accent: 'Conidia' } }),
  pa('aspergillus', 'Aspergillus (conidiophore)', ['aspergillus', 'conidiophore', 'conidia', 'mold', 'aspergillosis', 'fungal spores'], { primary: '#e9d48a', secondary: '#9a7a2a', accent: '#5fa04a' },
    (c, u) => {
      let s = tubeLine('M50 98 Q48 70 50 48', c.primary, 6);
      ring(50, 36, 14, 14, 13, Math.PI * 0.95).forEach((p, i) => {
        if (p.y > 46) return;
        const ox = Math.cos(p.a), oy = Math.sin(p.a);
        for (let k = 0; k < 4; k++) s += circle(p.x + ox * (5 + k * 5), p.y + oy * (5 + k * 5), 2.6 - k * 0.15, shade(c.accent, k * 0.06), dark(c.accent, 0.42), 0.7);
      });
      const g = sphere(u, 'v', c.primary, { hi: 0.45 });
      return s + defs(g) + circle(50, 36, 13, g.url, dark(c.primary, 0.42), 1.4) + gloss(45, 31, 4, 2.4, 0.5);
    }, { roles: { primary: 'Stalk / vesicle', secondary: 'Detail', accent: 'Conidia' } }),

  // ---- protists & helminths --------------------------------------------------------------------
  pa('trypanosome', 'Trypanosome', ['trypanosome', 'trypanosoma', 'sleeping sickness', 'chagas', 'african trypanosomiasis', 'flagellate', 'protozoa'], { primary: '#9fcbf0', secondary: '#33529e', accent: '#7fb0e8' },
    (c, u) => {
      const d = 'M6 36 C20 24 36 40 52 30 C68 20 84 34 100 28 C106 26 110 30 104 34 C88 42 70 30 54 40 C38 50 20 40 6 36Z';
      let s = microbe(u, 'b', d, c.primary, { cx: 56, cy: 34, rx: 46, ry: 8 }, { tex: 10, env: false, sw: 1.8 });
      s += `<path d="M12 34 C24 24 36 36 52 28 C68 18 84 30 102 24" fill="none" stroke="${c.accent}" stroke-width="1.6" stroke-dasharray="1 0" opacity="0.9"/>` + flagellum('M102 24 q8 -4 16 -2', c.secondary);
      return s + nucleusDetail(u, 'n', blob(56, 35, 5, 3.6, { n: 7, seed: 3 }), { cx: 56, cy: 35, rx: 5, ry: 3.6 }, c.secondary, { seed: 3, nucleolus: false, sw: 0.9 }) + circle(18, 36, 1.8, dark(c.secondary, 0.2));
    }, { w: 120, h: 60, roles: { primary: 'Cell body', secondary: 'Nucleus / flagellum', accent: 'Undulating membrane' } }),
  pa('plasmodium-rbc', 'Malaria-infected red cell', ['plasmodium', 'malaria', 'ring stage', 'trophozoite', 'infected erythrocyte', 'p. falciparum'], { primary: '#e57373', secondary: '#7a3fa8', accent: '#f6c945' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 38, cy: 30, hi: 0.4, lo: -0.18 });
      let s = defs(g) + ellipse(50, 50, 44, 40, g.url, dark(c.primary, 0.42), 2) + ellipse(50, 50, 26, 22, dark(c.primary, 0.08), 'none', 0, ' opacity="0.5"');
      [[38, 40, 9], [62, 60, 7.4]].forEach(([x, y, r]) => { s += circle(x, y, r, 'none', c.secondary, 2.6) + circle(x + r * 0.7, y - r * 0.7, 2.6, dark(c.secondary, 0.2)); });
      s += speckle(50, 50, 30, 26, 12, 1, dark(c.primary, 0.3), 5, 0.6);
      return s + gloss(32, 26, 10, 4, 0.45, -20);
    }, { roles: { primary: 'Red cell', secondary: 'Parasites', accent: 'Accent' } }),
  pa('amoeba', 'Amoeba', ['amoeba', 'entamoeba', 'pseudopodia', 'protozoa', 'amoebic', 'naegleria'], { primary: '#b9dda0', secondary: '#3f6d2c', accent: '#f2c94c' },
    (c, u) => {
      const sh = outline([[10, 52], [18, 34], [12, 18], [28, 22], [40, 12], [52, 22], [70, 10], [78, 26], [94, 34], [84, 50], [92, 70], [72, 70], [62, 88], [46, 76], [28, 86], [24, 66]], 1.05);
      let s = microbe(u, 'b', sh.d, c.primary, sh, { tex: 30, env: false });
      s += nucleusDetail(u, 'n', blob(52, 48, 9, 8, { n: 8, seed: 4 }), { cx: 52, cy: 48, rx: 9, ry: 8 }, c.secondary, { seed: 4, nucleolus: 'big', sw: 1 });
      s += vesicle(32, 38, 5, light(c.accent, 0.2)) + vesicle(70, 32, 4, light(c.accent, 0.2)) + vesicle(40, 66, 3.6, '#e8f4fb') + vesicle(72, 58, 3, '#e8f4fb');
      return s + gloss(34, 26, 8, 3, 0.45);
    }, { roles: { primary: 'Cytoplasm', secondary: 'Nucleus', accent: 'Food vacuoles' } }),
  pa('giardia', 'Giardia', ['giardia', 'giardia lamblia', 'giardiasis', 'flagellate', 'protozoa', 'trophozoite'], { primary: '#f2c4a0', secondary: '#7a4a9b', accent: '#9aa5b1' },
    (c, u) => {
      let s = flagellum('M30 30 Q14 26 4 34 M30 50 Q14 54 4 48 M70 30 Q86 26 96 34 M70 50 Q86 54 96 48 M44 84 Q40 94 34 98 M56 84 Q60 94 66 98 M48 86 Q48 94 46 99 M52 86 Q52 94 54 99', c.accent);
      const d = 'M50 8 C76 8 86 30 80 52 C74 72 60 86 50 88 C40 86 26 72 20 52 C14 30 24 8 50 8Z';
      s += microbe(u, 'b', d, c.primary, { cx: 50, cy: 46, rx: 30, ry: 38 }, { tex: 14 });
      [[38, 34], [62, 34]].forEach(([x, y], i) => { s += nucleusDetail(u, `n${i}`, blob(x, y, 7, 9, { n: 8, seed: i + 3 }), { cx: x, cy: y, rx: 7, ry: 9 }, c.secondary, { seed: i + 3, nucleolus: 'big', sw: 1 }); });
      return s + `<path d="M50 50 V82 M46 54 Q50 58 54 54" fill="none" stroke="${dark(c.primary, 0.3)}" stroke-width="1.6"/>` + gloss(38, 18, 8, 3, 0.45);
    }, { roles: { primary: 'Cell body', secondary: 'Nuclei', accent: 'Flagella' } }),
  pa('helminth', 'Helminth (roundworm)', ['helminth', 'roundworm', 'nematode', 'worm', 'ascaris', 'parasitic worm', 'type 2 immunity'], { primary: '#f0c8b0', secondary: '#b5735a', accent: '#d98b70' },
    (c) => {
      const d = 'M12 82 C4 56 30 46 46 58 C62 70 82 64 84 44 C86 24 64 14 48 24';
      let s = tubeLine(d, c.primary, 12);
      s += `<path d="${d}" fill="none" stroke="${dark(c.primary, 0.12)}" stroke-width="12" stroke-dasharray="0.8 3.4" opacity="0.6"/>`;
      return s + circle(48, 24, 2.2, c.secondary) + `<path d="${d}" fill="none" stroke="#fff" stroke-width="2" opacity="0.4" stroke-linecap="round" transform="translate(-1.6 -2.6)"/>`;
    }, { roles: { primary: 'Body', secondary: 'Mouth', accent: 'Accent' } }),
  pa('prion', 'Prion (misfolded protein)', ['prion', 'prp', 'prpsc', 'misfolding', 'cjd', 'mad cow', 'protein aggregate', 'tse'], { primary: '#c95fc0', secondary: '#5aa7e6', accent: '#f6c945' },
    (c, u) => {
      // a normal α-helical PrP converting to β-sheet-rich aggregate
      let s = domain(18, 50, 12, 14, c.secondary) + `<path d="M34 50 H46 l-5 -4 M46 50 l-5 4" fill="none" stroke="#52606d" stroke-width="2" stroke-linecap="round"/>`;
      for (let i = 0; i < 6; i++) {
        const x = 58 + (i % 3) * 13, y = 32 + Math.floor(i / 3) * 30, col = i % 2 ? c.primary : shade(c.primary, 0.12);
        s += `<g transform="rotate(${i % 2 ? 12 : -10} ${x} ${y})"><path d="M${x - 8} ${y - 10} H${x + 2} V${y - 14} L${x + 10} ${y - 6} L${x + 2} ${y + 2} V${y - 2} H${x - 8} Z" fill="${col}" stroke="${dark(col, 0.42)}" stroke-width="1" stroke-linejoin="round"/><path d="M${x - 8} ${y + 4} H${x + 2} V${y} L${x + 10} ${y + 8} L${x + 2} ${y + 16} V${y + 12} H${x - 8} Z" fill="${shade(col, -0.1)}" stroke="${dark(col, 0.42)}" stroke-width="1" stroke-linejoin="round"/></g>`;
      }
      return s;
    }, { w: 100, h: 90, roles: { primary: 'Misfolded PrPˢᶜ', secondary: 'Normal PrPᶜ', accent: 'Accent' } }),
];
