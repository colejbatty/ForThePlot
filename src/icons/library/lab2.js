// More lab equipment: liquid handling, molecular biology, instruments, glassware, safety, culture.

import { sphere, defs, path, circle, ellipse, rect, line, gloss, dark, light, shade, n, rng, smooth, smoothOpen, blob, ring, speckle, linear } from './kit.js';
import { glassGrad, liquidGrad, caseGrad, capGrad, capGradV, shine, ridges } from './lab.js';
import { pack, round } from './cellkit.js';

const R3 = { primary: 'Body', secondary: 'Detail', accent: 'Accent' };
const lb = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Lab equipment', tags, colors, roles: R3, draw, size: 100, shape: 'rect', ...extra });
const cu = (id, name, tags, colors, draw, extra = {}) => ({ id, name, category: 'Cell culture & assays', tags, colors, roles: R3, draw, size: 100, shape: 'rect', ...extra });

/** Instrument housing: lit from the top, with a darker base and a top highlight. */
function housing(u, key, x, y, w, h, col, r = 6) {
  const g = caseGrad(u, key, col);
  return defs(g) + rect(x, y + 2, w, h, r, shade(col, -0.3)) + rect(x, y, w, h, r, g.url, shade(col, -0.4), 1.4) + `<path d="M${x + r} ${y + 1.6} H${x + w - r}" stroke="#fff" stroke-width="1.4" opacity="0.8"/>`;
}
/** Dark display with a glint. */
const screen = (x, y, w, h, col = '#24384a', txt = '') => rect(x, y, w, h, 2.4, col, shade(col, -0.4), 1) + `<path d="M${x + 2} ${y + h - 2} L${x + w * 0.4} ${y + 2}" stroke="#fff" stroke-width="${n(Math.min(w, h) * 0.12)}" opacity="0.12"/>` + (txt ? `<text x="${x + w / 2}" y="${y + h / 2 + 2.4}" font-size="${n(h * 0.42)}" font-family="Arial" font-weight="700" text-anchor="middle" fill="#7fe0c0">${txt}</text>` : '');
const knob = (x, y, r, col) => circle(x, y, r, col, shade(col, -0.4), 1) + circle(x - r * 0.3, y - r * 0.32, r * 0.35, '#fff', 'none', 0, ' opacity="0.6"');
/** A clear plastic tube with liquid and a cap (PCR / test tubes). */
function vial(u, key, x, y, w, h, liquid, cap, { fill = 0.55, conical = true } = {}) {
  const gg = glassGrad(u, `${key}g`, '#e8eef4'), lg = liquidGrad(u, `${key}l`, liquid), cg = capGrad(u, `${key}c`, cap);
  const body = conical ? `M${x} ${y} H${x + w} V${y + h * 0.6} L${x + w / 2 + 1} ${y + h} H${x + w / 2 - 1} L${x} ${y + h * 0.6} Z` : `M${x} ${y} H${x + w} V${y + h - w / 2} A${w / 2} ${w / 2} 0 0 1 ${x} ${y + h - w / 2} Z`;
  const ly = y + h * (1 - fill);
  const liq = conical ? `M${x + 0.8} ${ly} H${x + w - 0.8} V${y + h * 0.6} L${x + w / 2 + 0.6} ${y + h - 1} H${x + w / 2 - 0.6} L${x + 0.8} ${y + h * 0.6} Z` : `M${x + 0.8} ${ly} H${x + w - 0.8} V${y + h - w / 2} A${w / 2 - 0.8} ${w / 2 - 0.8} 0 0 1 ${x + 0.8} ${y + h - w / 2} Z`;
  return defs(gg, lg, cg) + path(body, gg.url, '#8a9aaa', 1) + path(liq, lg.url) + shine(x + w * 0.2, y + 2, h * 0.5, Math.max(1, w * 0.14)) + rect(x - 1, y - 4, w + 2, 5, 1.6, cg.url, shade(cap, -0.4), 1);
}
/** Glass vessel outline with liquid (bottles, cylinders, flasks). */
function glass(u, key, d, liquidD, liquid, base = '#e8f2f8') {
  const gg = glassGrad(u, `${key}g`, base), lg = liquidGrad(u, `${key}l`, liquid);
  return defs(gg, lg) + path(d, gg.url, '#7f93a8', 1.6) + (liquidD ? path(liquidD, lg.url) : '');
}

export const lab2 = [
  // ---- liquid handling & molecular biology --------------------------------------------------------
  lb('multichannel-pipette', 'Multichannel pipette', ['multichannel pipette', '8-channel', 'pipette', 'liquid handling', 'plate pipetting'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#f2f4f7' },
    (c, u) => {
      const g = capGradV(u, 'h', c.primary);
      let s = defs(g) + rect(42, 2, 16, 44, 6, g.url, shade(c.primary, -0.4), 1.4) + rect(46, 0, 8, 6, 3, c.secondary, shade(c.secondary, -0.4), 1) + screen(45, 12, 10, 7, '#24384a');
      s += path('M30 46 H70 L74 60 H26 Z', g.url, shade(c.primary, -0.4), 1.4) + rect(24, 58, 52, 6, 2, c.secondary, shade(c.secondary, -0.4), 1);
      for (let i = 0; i < 8; i++) { const x = 28.6 + i * 6.2; s += path(`M${x - 2} 64 H${x + 2} L${x + 0.6} 94 H${x - 0.6} Z`, c.accent, '#9aa5b1', 0.8) + line(x - 0.6, 66, x - 0.2, 88, '#fff', 0.6, ' opacity="0.9"'); }
      return s + shine(45, 22, 20, 2);
    }, { roles: { primary: 'Body', secondary: 'Plunger / ejector', accent: 'Tips' } }),
  lb('pipette-tips', 'Pipette tip box', ['pipette tips', 'tip box', 'tips', 'filter tips', 'consumables'], { primary: '#4a8fe7', secondary: '#f2f4f7', accent: '#f2c94c' },
    (c, u) => {
      let s = housing(u, 'b', 6, 40, 108, 46, c.primary, 4);
      const g = caseGrad(u, 't', c.secondary);
      s += defs(g) + rect(4, 30, 112, 12, 3, g.url, '#8a9aaa', 1.2);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 12; k++) { const x = 10 + k * 9, y = 26 + r * 5; s += path(`M${x - 2.6} ${y} H${x + 2.6} L${x + 1.4} ${y - 14 + r * 4} H${x - 1.4} Z`, r ? c.accent : light(c.accent, 0.4), shade(c.accent, -0.35), 0.6); }
      return s;
    }, { w: 120, h: 90, roles: { primary: 'Box', secondary: 'Rack', accent: 'Tips' } }),
  lb('pipette-controller', 'Pipette controller (pipet-aid)', ['pipet aid', 'pipette controller', 'serological pipette', 'pipetboy', 'cell culture', 'liquid handling'], { primary: '#5aa7e6', secondary: '#e8ecf0', accent: '#f39a6b' },
    (c, u) => {
      const g = capGradV(u, 'h', c.primary);
      let s = defs(g) + path('M40 30 Q38 14 50 10 H66 Q76 10 74 24 L70 46 Q68 54 60 54 H52 Q44 54 42 46 Z', g.url, shade(c.primary, -0.42), 1.6) + path('M54 54 L50 84 Q50 90 56 90 H60 Q64 90 62 84 L62 54 Z', g.url, shade(c.primary, -0.42), 1.4);
      s += knob(64, 20, 3, c.accent) + knob(64, 30, 3, shade(c.accent, -0.1));
      const gg = glassGrad(u, 'p', '#eef3f7'), lg = liquidGrad(u, 'l', c.accent);
      s += defs(gg, lg) + rect(26, 40, 6, 58, 3, gg.url, '#8a9aaa', 1) + rect(27, 70, 4, 26, 2, lg.url);
      for (let y = 46; y < 94; y += 6) s += line(26, y, 29, y, '#52606d', 0.6);
      return s + path('M32 40 Q40 36 44 40', 'none', '#8a9aaa', 2) + gloss(52, 18, 6, 3, 0.5);
    }, { roles: { primary: 'Body', secondary: 'Detail', accent: 'Liquid / buttons' } }),
  lb('pcr-tubes', 'PCR tube strip', ['pcr tubes', 'strip tubes', '8-strip', 'qpcr', 'thermocycler tubes', 'pcr'], { primary: '#eef3f7', secondary: '#f2c94c', accent: '#e85d75' },
    (c, u) => { let s = rect(4, 6, 112, 4, 2, c.secondary, shade(c.secondary, -0.4), 0.8); for (let i = 0; i < 8; i++) s += vial(u, `t${i}`, 7 + i * 14, 14, 10, 38, c.accent, c.secondary, { fill: 0.32 }); return s; },
    { w: 120, h: 56, roles: { primary: 'Tubes', secondary: 'Caps', accent: 'Sample' } }),
  lb('thermocycler', 'Thermocycler (PCR machine)', ['thermocycler', 'pcr machine', 'qpcr', 'real-time pcr', 'thermal cycler', 'amplification'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#7fe0c0' },
    (c, u) => {
      let s = housing(u, 'b', 6, 34, 108, 56, c.primary);
      const lg = caseGrad(u, 'l', shade(c.primary, -0.05));
      s += defs(lg) + path('M10 34 L20 8 H100 L110 34 Z', lg.url, shade(c.primary, -0.4), 1.4) + rect(30, 14, 60, 4, 2, c.secondary, 'none', 0, ' opacity="0.8"');
      s += screen(16, 44, 40, 24, '#24384a') + `<path d="M20 62 L26 50 L32 60 L38 48 L44 58 L50 50" fill="none" stroke="${c.accent}" stroke-width="1.6"/>`;
      return s + knob(76, 56, 6, c.secondary) + rect(88, 50, 18, 4, 2, '#9aa5b1') + rect(88, 58, 18, 4, 2, '#9aa5b1') + circle(102, 80, 2, '#4caf50');
    }, { w: 120, h: 96, roles: { primary: 'Housing', secondary: 'Controls', accent: 'Display' } }),
  lb('gel-electrophoresis', 'Gel electrophoresis', ['gel electrophoresis', 'agarose gel', 'electrophoresis tank', 'dna gel', 'running buffer'], { primary: '#cfe6f5', secondary: '#9fd0b8', accent: '#e05252' },
    (c, u) => {
      const tg = glassGrad(u, 't', c.primary);
      let s = defs(tg) + path('M8 30 L20 18 H112 L112 74 L100 86 H8 Z', tg.url, '#6f8aa0', 1.6) + path('M8 30 H100 V86 H8 Z', light(c.primary, 0.2), '#6f8aa0', 1.2);
      s += rect(22, 38, 64, 40, 2, c.secondary, shade(c.secondary, -0.35), 1, ' opacity="0.9"');
      for (let k = 0; k < 6; k++) { const x = 26 + k * 10; s += rect(x, 42, 6, 2.4, 0.6, shade(c.secondary, -0.3)); [52, 58, 66].forEach((y, j) => { if ((k + j) % 2 === 0 || k === 0) s += rect(x, y + (k === 0 ? j : 0), 6, 1.8, 0.8, '#3d6fb0', 'none', 0, ' opacity="0.8"'); }); }
      s += rect(102, 22, 4, 10, 1, '#1f2933') + rect(102, 66, 4, 10, 1, c.accent) + `<path d="M104 22 Q110 6 118 8 M104 76 Q116 80 118 66" fill="none" stroke="#1f2933" stroke-width="1.6"/><path d="M104 76 Q116 80 118 66" fill="none" stroke="${c.accent}" stroke-width="1.6"/>`;
      return s + shine(12, 34, 44, 2);
    }, { w: 120, h: 90, roles: { primary: 'Tank', secondary: 'Gel', accent: 'Electrode' } }),
  lb('gel-image', 'DNA gel image', ['gel', 'agarose gel', 'dna ladder', 'bands', 'pcr product', 'gel image'], { primary: '#1f2a38', secondary: '#f4f8ff', accent: '#e05252' },
    (c) => {
      let s = rect(4, 4, 92, 92, 4, c.primary, shade(c.primary, -0.4), 1.4);
      const ladder = [16, 24, 32, 40, 50, 62, 76];
      for (let k = 0; k < 6; k++) {
        const x = 10 + k * 14.4;
        s += rect(x, 9, 10, 3, 1, shade(c.primary, 0.25));
        (k === 0 ? ladder : [[30], [44], [30, 56], [44], [62]][k - 1] || []).forEach((y, i) => { s += rect(x, y, 10, 2.2, 1, c.secondary, 'none', 0, ` opacity="${k === 0 ? 0.75 : 0.95}"`) + rect(x - 1, y - 0.8, 12, 3.8, 1.6, c.secondary, 'none', 0, ' opacity="0.18"'); });
      }
      return s;
    }, { roles: { primary: 'Gel', secondary: 'Bands', accent: 'Accent' } }),
  lb('western-blot', 'Western blot', ['western blot', 'immunoblot', 'protein bands', 'sds-page', 'membrane', 'loading control'], { primary: '#f4f1ea', secondary: '#2b2b33', accent: '#9aa5b1' },
    (c) => {
      let s = rect(4, 10, 92, 80, 3, c.primary, shade(c.primary, -0.3), 1.2);
      const blot = (y, ints) => ints.map((v, k) => ellipse(18 + k * 16, y, 6.4, 2.6, c.secondary, 'none', 0, ` opacity="${v}"`) + ellipse(18 + k * 16, y, 8, 3.6, c.secondary, 'none', 0, ` opacity="${v * 0.2}"`)).join('');
      s += blot(30, [0.9, 0.7, 0.4, 0.15, 0.85, 0.55]) + blot(50, [0.5, 0.6, 0.7, 0.8, 0.9, 0.95]) + blot(74, [0.8, 0.8, 0.8, 0.8, 0.8, 0.8]);
      return s;
    }, { roles: { primary: 'Membrane', secondary: 'Bands', accent: 'Accent' } }),

  // ---- instruments --------------------------------------------------------------------------------
  lb('plate-reader', 'Plate reader', ['plate reader', 'microplate reader', 'elisa reader', 'luminescence', 'fluorescence', 'absorbance'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#7fe0c0' },
    (c, u) => {
      let s = housing(u, 'b', 6, 18, 108, 66, c.primary);
      s += rect(18, 60, 60, 18, 2, shade(c.primary, -0.25), shade(c.primary, -0.45), 1) + rect(22, 62, 52, 10, 1.6, '#f5f7fa', '#9aa5b1', 0.8);
      for (let k = 0; k < 10; k++) s += circle(26 + k * 5, 67, 1.6, k % 3 ? c.secondary : light(c.secondary, 0.4));
      return s + screen(84, 28, 22, 14, '#24384a', '450') + knob(90, 54, 3, c.secondary) + knob(100, 54, 3, '#9aa5b1') + rect(14, 26, 62, 3, 1.5, c.secondary, 'none', 0, ' opacity="0.8"');
    }, { w: 120, h: 90, roles: { primary: 'Housing', secondary: 'Accents', accent: 'Display' } }),
  lb('incubator', 'CO₂ incubator', ['incubator', 'co2 incubator', 'cell culture', '37 c', 'tissue culture'], { primary: '#e8ecf0', secondary: '#9aa5b1', accent: '#7fe0c0' },
    (c, u) => {
      let s = housing(u, 'b', 10, 4, 80, 92, c.primary, 5) + rect(16, 20, 68, 70, 3, shade(c.primary, -0.06), shade(c.primary, -0.4), 1.2);
      const gg = glassGrad(u, 'g', '#dfeaf2');
      s += defs(gg) + rect(22, 26, 56, 58, 2, gg.url, '#8a9aaa', 1);
      [44, 64].forEach((y) => { s += rect(24, y, 52, 2, 1, c.secondary); });
      [[30, 38], [46, 38], [36, 58], [56, 58], [64, 38]].forEach(([x, y]) => { s += rect(x - 6, y, 12, 6, 1.4, '#f4c9d0', '#c47a8a', 0.7); });
      return s + screen(20, 8, 26, 9, '#24384a', '37.0') + rect(80, 40, 3, 20, 1.5, c.secondary, shade(c.secondary, -0.4), 0.8) + shine(25, 30, 40, 2);
    }, { roles: { primary: 'Housing', secondary: 'Shelves / handle', accent: 'Display' } }),
  lb('biosafety-cabinet', 'Biosafety cabinet (hood)', ['biosafety cabinet', 'bsc', 'tissue culture hood', 'laminar flow', 'sterile', 'class ii'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#cfe6f5' },
    (c, u) => {
      let s = housing(u, 'b', 4, 4, 112, 84, c.primary, 5) + rect(10, 18, 100, 54, 2, shade(c.primary, -0.12), shade(c.primary, -0.4), 1);
      const gg = glassGrad(u, 'g', c.accent);
      s += defs(gg) + rect(12, 20, 96, 30, 2, gg.url, '#8a9aaa', 1, ' opacity="0.85"') + rect(10, 72, 100, 6, 1, shade(c.primary, -0.3)) + rect(10, 8, 60, 6, 2, c.secondary, 'none', 0, ' opacity="0.8"');
      s += rect(36, 58, 8, 12, 2, '#f4c9d0', '#c47a8a', 0.8) + rect(60, 62, 22, 8, 2, '#f2f4f7', '#9aa5b1', 0.8);
      return s + rect(10, 88, 8, 8, 1, shade(c.primary, -0.35)) + rect(102, 88, 8, 8, 1, shade(c.primary, -0.35)) + shine(18, 22, 24, 2);
    }, { w: 120, h: 98, roles: { primary: 'Cabinet', secondary: 'Panel', accent: 'Sash glass' } }),
  lb('freezer', '−80 °C freezer', ['freezer', '-80', 'ultra-low freezer', 'cold storage', 'sample storage', 'biobank'], { primary: '#f2f4f7', secondary: '#4a8fe7', accent: '#7fe0c0' },
    (c, u) => housing(u, 'b', 18, 4, 64, 92, c.primary, 5) + rect(22, 16, 56, 76, 3, shade(c.primary, -0.04), shade(c.primary, -0.38), 1) + rect(70, 30, 4, 30, 2, c.secondary, shade(c.secondary, -0.4), 0.8)
      + screen(24, 6, 22, 8, '#24384a', '−80') + `<g stroke="${c.secondary}" stroke-width="1.6" stroke-linecap="round"><path d="M44 70 V82 M38 73 L50 79 M50 73 L38 79"/></g>` + shine(26, 20, 60, 2), { roles: { primary: 'Housing', secondary: 'Handle / snowflake', accent: 'Display' } }),
  lb('liquid-nitrogen-dewar', 'Liquid nitrogen dewar', ['liquid nitrogen', 'ln2', 'dewar', 'cryostorage', 'cryopreservation', 'cell bank'], { primary: '#c9d1db', secondary: '#4a8fe7', accent: '#eef6fb' },
    (c, u) => {
      const g = capGradV(u, 'b', c.primary);
      let s = defs(g) + path('M24 30 Q24 20 34 18 H66 Q76 20 76 30 V88 Q76 96 66 96 H34 Q24 96 24 88 Z', g.url, shade(c.primary, -0.42), 1.6) + rect(36, 8, 28, 12, 3, capGradV(u, 'c', c.secondary).url, shade(c.secondary, -0.4), 1.2);
      s = defs(capGradV(u, 'c', c.secondary)) + s;
      s += `<path d="M40 8 Q34 2 40 -2 M50 6 Q46 0 52 -4 M60 8 Q66 2 60 -2" fill="none" stroke="${c.accent}" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>`;
      return s + rect(30, 50, 40, 14, 2, '#f2f4f7', '#9aa5b1', 0.8) + `<text x="50" y="60" font-size="8" font-family="Arial" font-weight="700" text-anchor="middle" fill="${c.secondary}">LN₂</text>`;
    }, { roles: { primary: 'Dewar', secondary: 'Lid', accent: 'Vapor' } }),
  lb('vortex-mixer', 'Vortex mixer', ['vortex', 'vortex mixer', 'mixing', 'resuspend', 'shaker'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#f39a6b' },
    (c, u) => housing(u, 'b', 16, 56, 68, 36, c.primary, 8) + ellipse(50, 56, 16, 5, '#2b3a4a', '#1f2933', 1) + knob(30, 76, 5, c.secondary) + rect(58, 72, 18, 6, 3, '#9aa5b1')
      + vial(u, 't', 45, 14, 10, 38, c.accent, c.secondary) + `<path d="M34 24 Q30 30 34 36 M66 24 Q70 30 66 36" fill="none" stroke="#7b8794" stroke-width="1.6" stroke-linecap="round"/>`, { roles: { primary: 'Housing', secondary: 'Controls / cap', accent: 'Sample' } }),
  lb('magnetic-stirrer', 'Magnetic stirrer', ['magnetic stirrer', 'stir plate', 'stir bar', 'hot plate', 'mixing', 'buffer prep'], { primary: '#e8ecf0', secondary: '#e05252', accent: '#9fcbf0' },
    (c, u) => housing(u, 'b', 10, 70, 80, 24, c.primary, 5) + knob(24, 82, 4, '#52606d') + knob(76, 82, 4, c.secondary) + rect(14, 66, 72, 6, 2, '#f2f4f7', '#9aa5b1', 1)
      + glass(u, 'k', 'M26 18 H74 V62 Q74 66 70 66 H30 Q26 66 26 62 Z', 'M27.6 34 H72.4 V62 Q72.4 64.4 70 64.4 H30 Q27.6 64.4 27.6 62 Z', c.accent) + rect(42, 59, 16, 4, 2, '#f6f2e6', '#9aa5b1', 0.7) + `<path d="M36 46 Q50 40 64 46" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.6"/>`,
    { roles: { primary: 'Housing', secondary: 'Heat knob', accent: 'Solution' } }),
  lb('water-bath', 'Water bath', ['water bath', 'thermostatic bath', 'heating', 'thawing', '37 c'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#9fcbf0' },
    (c, u) => {
      let s = housing(u, 'b', 6, 30, 108, 60, c.primary, 5);
      const lg = liquidGrad(u, 'w', c.accent);
      s += defs(lg) + rect(12, 36, 96, 30, 3, lg.url, shade(c.accent, -0.35), 1) + `<path d="M16 42 q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.7"/>`;
      s += vial(u, 'a', 30, 22, 9, 30, '#e8899a', '#f2c94c', { conical: false }) + vial(u, 'b2', 48, 22, 9, 30, '#e8899a', c.secondary, { conical: false });
      return s + screen(78, 72, 24, 12, '#24384a', '37°') + knob(20, 78, 4, c.secondary);
    }, { w: 120, h: 94, roles: { primary: 'Housing', secondary: 'Controls', accent: 'Water' } }),
  lb('analytical-balance', 'Analytical balance', ['balance', 'scale', 'analytical balance', 'weighing', 'weigh boat'], { primary: '#e8ecf0', secondary: '#9aa5b1', accent: '#7fe0c0' },
    (c, u) => {
      let s = housing(u, 'b', 6, 64, 108, 30, c.primary, 4);
      const gg = glassGrad(u, 'g', '#e6f0f6');
      s += defs(gg) + path('M18 64 V20 Q18 14 24 14 H96 Q102 14 102 20 V64', gg.url, '#8a9aaa', 1.4) + ellipse(60, 58, 22, 4, '#c9d1db', '#7b8794', 1) + rect(58, 58, 4, 6, 1, '#7b8794');
      s += path('M50 54 L54 48 H66 L70 54 Z', '#f2f4f7', '#9aa5b1', 0.8) + speckle(60, 51, 5, 1.4, 8, 0.7, '#f39a6b', 3, 1);
      return s + screen(38, 72, 44, 14, '#24384a', '0.0500') + shine(24, 20, 36, 2);
    }, { w: 120, h: 96, roles: { primary: 'Housing', secondary: 'Pan', accent: 'Display' } }),
  lb('ph-meter', 'pH meter', ['ph meter', 'ph', 'electrode', 'buffer', 'acidity', 'calibration'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#9fe0b0' },
    (c, u) => housing(u, 'b', 4, 50, 60, 44, c.primary, 6) + screen(12, 58, 44, 16, '#24384a', '7.40') + knob(20, 84, 3.4, c.secondary) + knob(34, 84, 3.4, '#9aa5b1') + knob(48, 84, 3.4, '#9aa5b1')
      + `<path d="M64 60 Q76 56 78 40 V20" fill="none" stroke="#52606d" stroke-width="2"/>` + rect(74, 14, 8, 50, 4, capGradV(u, 'e', '#dfe6ee').url, '#7b8794', 1) + defs(capGradV(u, 'e', '#dfe6ee'))
      + glass(u, 'k', 'M66 46 H96 V90 Q96 94 92 94 H70 Q66 94 66 90 Z', 'M67.4 62 H94.6 V90 Q94.6 92.6 92 92.6 H70 Q67.4 92.6 67.4 90 Z', c.accent), { roles: { primary: 'Meter', secondary: 'Buttons', accent: 'Solution' } }),
  lb('spectrophotometer', 'Spectrophotometer (NanoDrop)', ['nanodrop', 'spectrophotometer', 'a260', 'dna quantification', 'protein concentration', 'uv-vis'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#7fe0c0' },
    (c, u) => {
      let s = housing(u, 'b', 30, 48, 60, 40, c.primary, 6) + path('M34 48 L44 20 Q46 16 50 16 H70 Q74 16 76 20 L86 48', caseGrad(u, 'a', shade(c.primary, -0.04)).url, shade(c.primary, -0.4), 1.4);
      s = defs(caseGrad(u, 'a', shade(c.primary, -0.04))) + s;
      s += circle(60, 48, 3, '#9aa5b1', '#52606d', 1) + circle(60, 46, 1.6, '#9fcbf0');
      return s + housing(u, 's', 2, 60, 26, 32, '#2b3a4a', 3) + `<path d="M6 82 L10 74 L14 66 L18 74 L22 82" fill="none" stroke="${c.accent}" stroke-width="1.4"/>` + rect(40, 70, 40, 3, 1.5, c.secondary, 'none', 0, ' opacity="0.8"');
    }, { w: 92, h: 94, roles: { primary: 'Housing', secondary: 'Accent strip', accent: 'Spectrum' } }),
  lb('cuvette', 'Cuvette', ['cuvette', 'absorbance', 'od600', 'spectrophotometry', 'optical density'], { primary: '#e8f2f8', secondary: '#f2c94c', accent: '#5aa7e6' },
    (c, u) => glass(u, 'c', 'M34 6 H66 V94 H34 Z', 'M35.4 40 H64.6 V92.6 H35.4 Z', c.accent, c.primary) + rect(34, 6, 32, 10, 1, shade(c.primary, -0.12), '#7f93a8', 1) + shine(38, 20, 64, 2.4)
      + `<path d="M4 64 H30 M70 64 H96" stroke="${c.secondary}" stroke-width="2.4" stroke-dasharray="4 2"/>`, { roles: { primary: 'Cuvette', secondary: 'Light beam', accent: 'Sample' } }),
  lb('chromatography-column', 'Chromatography column', ['chromatography', 'column', 'protein purification', 'affinity column', 'resin', 'fplc', 'ni-nta'], { primary: '#e8f2f8', secondary: '#f39a6b', accent: '#5aa7e6' },
    (c, u) => glass(u, 'c', 'M36 4 H64 V80 L54 90 V98 H46 V90 L36 80 Z', null, c.accent, c.primary) + rect(37.6, 12, 24.8, 12, 1, light(c.accent, 0.3), 'none', 0, ' opacity="0.85"')
      + rect(37.6, 24, 24.8, 50, 1, '#f6efe0') + speckle(50, 49, 11, 24, 40, 0.7, '#d9c8a0', 3, 1) + rect(37.6, 32, 24.8, 6, 1, c.secondary, 'none', 0, ' opacity="0.85"') + rect(37.6, 50, 24.8, 5, 1, c.accent, 'none', 0, ' opacity="0.7"') + shine(40, 8, 70, 2),
    { roles: { primary: 'Glass', secondary: 'Bound band', accent: 'Buffer / elution' } }),
  lb('mass-spectrometer', 'Mass spectrometer', ['mass spectrometer', 'mass spec', 'lc-ms', 'proteomics', 'metabolomics', 'ms/ms'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#7fe0c0' },
    (c, u) => housing(u, 'b', 30, 24, 84, 64, c.primary, 6) + housing(u, 'l', 4, 44, 30, 44, shade(c.primary, -0.05), 4) + rect(40, 34, 64, 4, 2, c.secondary, 'none', 0, ' opacity="0.8"')
      + screen(42, 46, 36, 24, '#24384a') + [[48, 12], [54, 6], [60, 16], [66, 10], [72, 4]].map(([x, h]) => line(x, 66, x, 66 - h, c.accent, 2)).join('') + rect(10, 50, 18, 30, 2, '#2b3a4a') + knob(94, 58, 4, c.secondary),
    { w: 120, h: 92, roles: { primary: 'Housing', secondary: 'Accent', accent: 'Spectrum' } }),
  lb('electron-microscope', 'Electron microscope', ['electron microscope', 'tem', 'sem', 'cryo-em', 'electron microscopy', 'ultrastructure'], { primary: '#e8ecf0', secondary: '#9aa5b1', accent: '#4a8fe7' },
    (c, u) => {
      const g = capGradV(u, 'col', c.primary);
      return defs(g) + housing(u, 'b', 10, 68, 100, 26, c.primary, 4) + path('M42 68 V30 L46 8 H74 L78 30 V68 Z', g.url, shade(c.primary, -0.42), 1.6) + [20, 34, 48, 58].map((y) => rect(40, y, 40, 4, 2, c.secondary, shade(c.secondary, -0.4), 0.8)).join('')
        + housing(u, 's', 86, 40, 30, 24, '#2b3a4a', 3) + speckle(101, 52, 10, 7, 14, 1, '#9aa5b1', 4, 1) + rect(16, 74, 18, 6, 2, c.accent, 'none', 0, ' opacity="0.8"');
    }, { w: 120, h: 96, roles: { primary: 'Column', secondary: 'Lenses', accent: 'Accent' } }),
  lb('cell-counter', 'Automated cell counter', ['cell counter', 'countess', 'cell count', 'viability', 'trypan blue', 'hemocytometer'], { primary: '#e8ecf0', secondary: '#4a8fe7', accent: '#9fcbf0' },
    (c, u) => housing(u, 'b', 10, 20, 80, 70, c.primary, 6) + screen(18, 28, 48, 36, '#24384a') + speckle(42, 46, 20, 14, 18, 1.4, c.accent, 5, 1) + speckle(42, 46, 20, 14, 5, 1.4, '#3d6fb0', 9, 1)
      + rect(70, 40, 14, 4, 1, '#2b3a4a') + rect(70, 36, 22, 4, 1, '#f2f4f7', '#9aa5b1', 0.6) + knob(30, 76, 4, c.secondary) + knob(46, 76, 4, '#9aa5b1'), { roles: { primary: 'Housing', secondary: 'Buttons', accent: 'Cells' } }),

  // ---- glassware ----------------------------------------------------------------------------------
  lb('media-bottle', 'Media bottle', ['media bottle', 'reagent bottle', 'duran bottle', 'culture medium', 'buffer', 'pbs'], { primary: '#e8f2f8', secondary: '#4a8fe7', accent: '#f08a9a' },
    (c, u) => glass(u, 'b', 'M38 16 H62 V26 Q78 32 78 46 V90 Q78 96 72 96 H28 Q22 96 22 90 V46 Q22 32 38 26 Z', 'M23.6 52 H76.4 V90 Q76.4 94.4 72 94.4 H28 Q23.6 94.4 23.6 90 Z', c.accent, c.primary)
      + rect(36, 4, 28, 14, 3, capGrad(u, 'c', c.secondary).url, shade(c.secondary, -0.4), 1.2) + defs(capGrad(u, 'c', c.secondary)) + ridges(36, 4, 28, 14, 7, shade(c.secondary, -0.3)) + rect(30, 60, 40, 18, 1.4, '#ffffff', '#9aa5b1', 0.8, ' opacity="0.9"') + shine(27, 40, 50, 2.6),
    { roles: { primary: 'Glass', secondary: 'Cap', accent: 'Medium' } }),
  lb('graduated-cylinder', 'Graduated cylinder', ['graduated cylinder', 'measuring cylinder', 'volume', 'glassware'], { primary: '#e8f2f8', secondary: '#52606d', accent: '#5aa7e6' },
    (c, u) => glass(u, 'g', 'M36 6 H62 L64 2 V90 H36 Z', 'M37.4 44 H62.6 V88.6 H37.4 Z', c.accent, c.primary) + rect(26, 90, 48, 6, 2, shade(c.primary, -0.1), '#7f93a8', 1.2)
      + Array.from({ length: 9 }, (_, i) => line(52, 14 + i * 8.4, i % 2 ? 58 : 61, 14 + i * 8.4, c.secondary, 0.8)).join('') + shine(39, 10, 76, 2.2), { roles: { primary: 'Glass', secondary: 'Graduations', accent: 'Liquid' } }),
  lb('round-bottom-flask', 'Round-bottom flask', ['round bottom flask', 'flask', 'synthesis', 'chemistry', 'glassware', 'distillation'], { primary: '#e8f2f8', secondary: '#7f93a8', accent: '#c95fc0' },
    (c, u) => glass(u, 'f', 'M42 4 H58 V36 A30 30 0 1 1 42 36 Z', 'M21 66 A29 29 0 0 0 79 66 Z', c.accent, c.primary) + rect(40, 2, 20, 5, 1.4, shade(c.primary, -0.1), c.secondary, 1) + gloss(34, 48, 6, 8, 0.6, 20),
    { roles: { primary: 'Glass', secondary: 'Rim', accent: 'Liquid' } }),
  lb('test-tube-rack', 'Test tubes in a rack', ['test tube', 'test tubes', 'tube rack', 'rack', 'samples', 'glassware'], { primary: '#e8f2f8', secondary: '#4a8fe7', accent: '#f39a3d' },
    (c, u) => {
      let s = '';
      [[20, c.accent], [40, '#5aa7e6'], [60, '#7fd36b'], [80, '#e85d75']].forEach(([x, col], i) => { s += vial(u, `t${i}`, x - 6, 14, 12, 66, col, '#d9e2ec', { conical: false, fill: 0.4 + (i % 2) * 0.15 }).replace(/<rect[^>]*rx="1.6"[^>]*\/>$/, ''); });
      const g = caseGrad(u, 'r', c.secondary);
      return s + defs(g) + rect(6, 40, 88, 8, 2, g.url, shade(c.secondary, -0.4), 1.2) + rect(6, 78, 88, 8, 2, g.url, shade(c.secondary, -0.4), 1.2) + rect(8, 48, 4, 30, 1, shade(c.secondary, -0.2)) + rect(88, 48, 4, 30, 1, shade(c.secondary, -0.2));
    }, { roles: { primary: 'Glass', secondary: 'Rack', accent: 'Liquid' } }),

  // ---- safety -------------------------------------------------------------------------------------
  lb('gloves', 'Nitrile gloves', ['gloves', 'nitrile', 'ppe', 'personal protective equipment', 'lab safety'], { primary: '#7fa8e8', secondary: '#5a86c8', accent: '#ffffff' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 35, cy: 30, hi: 0.4 });
      return defs(g) + path('M30 96 V60 L18 44 Q14 38 20 36 Q24 34 28 40 L34 48 V16 Q34 10 39 10 Q44 10 44 16 V40 V10 Q44 4 49 4 Q54 4 54 10 V40 V12 Q54 6 59 6 Q64 6 64 12 V42 V20 Q64 14 69 14 Q74 14 74 20 V64 Q74 80 66 88 V96 Z', g.url, shade(c.primary, -0.42), 1.6)
        + rect(28, 88, 40, 8, 3, c.secondary, shade(c.secondary, -0.4), 1.2) + `<path d="M40 30 V44 M50 26 V42 M60 30 V44" stroke="${shade(c.primary, -0.15)}" stroke-width="1" opacity="0.6"/>` + gloss(40, 54, 6, 10, 0.4, 0);
    }, { roles: { primary: 'Glove', secondary: 'Cuff', accent: 'Accent' } }),
  lb('lab-coat', 'Lab coat', ['lab coat', 'ppe', 'scientist', 'researcher', 'lab safety'], { primary: '#f6f7f9', secondary: '#c9d1db', accent: '#4a8fe7' },
    (c, u) => {
      const g = sphere(u, 'b', c.primary, { cx: 40, cy: 20, hi: 0.2, lo: -0.12 });
      return defs(g) + path('M36 6 L50 18 L64 6 L84 14 L96 54 L84 58 L78 40 V94 H22 V40 L16 58 L4 54 L16 14 Z', g.url, shade(c.secondary, -0.3), 1.6)
        + `<path d="M36 6 L44 40 L50 18 L56 40 L64 6 M50 18 V94" fill="none" stroke="${c.secondary}" stroke-width="1.6"/>` + [50, 64, 78].map((y) => circle(53, y, 1.6, c.secondary)).join('') + rect(60, 54, 12, 10, 1, 'none', c.secondary, 1.2) + rect(63, 48, 2, 10, 1, c.accent);
    }, { roles: { primary: 'Coat', secondary: 'Seams', accent: 'Pen' } }),
  lb('safety-goggles', 'Safety goggles', ['goggles', 'safety glasses', 'eye protection', 'ppe', 'lab safety'], { primary: '#cfe6f5', secondary: '#4a8fe7', accent: '#2b3a4a' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary);
      return `<path d="M6 40 Q2 30 10 28 M94 40 Q98 30 90 28" fill="none" stroke="${c.accent}" stroke-width="4" stroke-linecap="round"/>` + defs(g) + path('M10 30 Q10 20 22 20 H78 Q90 20 90 30 V44 Q90 56 76 56 Q62 56 56 48 Q50 44 44 48 Q38 56 24 56 Q10 56 10 44 Z', g.url, c.secondary, 3) + gloss(26, 32, 8, 4, 0.7, -20) + gloss(70, 32, 8, 4, 0.7, -20);
    }, { w: 100, h: 72, roles: { primary: 'Lens', secondary: 'Frame', accent: 'Strap' } }),
  lb('biohazard-bin', 'Biohazard waste bin', ['biohazard', 'waste', 'bsl-2', 'sharps', 'disposal', 'lab safety'], { primary: '#f2c94c', secondary: '#e05252', accent: '#1f2933' },
    (c, u) => {
      const g = capGradV(u, 'b', c.primary), lid = caseGrad(u, 'l', c.secondary);
      let s = defs(g, lid) + path('M22 24 H78 L72 94 H28 Z', g.url, shade(c.primary, -0.42), 1.6) + rect(16, 14, 68, 12, 4, lid.url, shade(c.secondary, -0.4), 1.4);
      s += circle(50, 60, 4, 'none', c.accent, 2.2);
      [0, 120, 240].forEach((a) => { s += `<g transform="rotate(${a} 50 60)"><path d="M50 42 A10 10 0 0 1 58 54 A7 7 0 0 0 50 49 A7 7 0 0 0 42 54 A10 10 0 0 1 50 42Z" fill="${c.accent}" transform="translate(0 -2)"/></g>`; });
      return s + circle(50, 60, 9.4, 'none', c.accent, 1.4) + shine(28, 30, 50, 2.4);
    }, { roles: { primary: 'Bin', secondary: 'Lid', accent: 'Symbol' } }),

  // ---- misc -----------------------------------------------------------------------------------------
  lb('microscope-slide', 'Microscope slide', ['microscope slide', 'slide', 'coverslip', 'histology', 'smear', 'staining'], { primary: '#e8f2f8', secondary: '#f2f4f7', accent: '#c95fc0' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary);
      return `<g transform="skewX(-18) translate(12 0)">` + defs(g) + rect(4, 20, 104, 30, 2, g.url, '#7f93a8', 1.4) + rect(4, 20, 26, 30, 2, c.secondary, '#9aa5b1', 1) + `<path d="M8 28 H26 M8 34 H22" stroke="#9aa5b1" stroke-width="1.4"/>`
        + rect(46, 23, 40, 24, 1, '#ffffff', '#9fb4c8', 0.8, ' opacity="0.6"') + path(blob(66, 35, 12, 8, { n: 9, seed: 3, wobble: 0.15 }), c.accent, 'none', 0, ' opacity="0.7"') + speckle(66, 35, 10, 6, 14, 0.9, shade(c.accent, -0.3), 4, 0.9) + '</g>';
    }, { w: 120, h: 70, roles: { primary: 'Glass', secondary: 'Label', accent: 'Specimen' } }),
  lb('hemocytometer', 'Hemocytometer', ['hemocytometer', 'counting chamber', 'neubauer', 'cell count', 'trypan blue'], { primary: '#e8f2f8', secondary: '#4a8fe7', accent: '#9aa5b1' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary);
      let s = defs(g) + rect(4, 24, 112, 40, 3, g.url, '#7f93a8', 1.4) + rect(20, 28, 80, 4, 1, c.accent, 'none', 0, ' opacity="0.5"') + rect(20, 56, 80, 4, 1, c.accent, 'none', 0, ' opacity="0.5"');
      [[36, 44], [84, 44]].forEach(([x, y]) => { s += rect(x - 9, y - 9, 18, 18, 1, '#ffffff', c.secondary, 0.8); for (let i = 1; i < 4; i++) s += line(x - 9 + i * 4.5, y - 9, x - 9 + i * 4.5, y + 9, c.secondary, 0.5) + line(x - 9, y - 9 + i * 4.5, x + 9, y - 9 + i * 4.5, c.secondary, 0.5); });
      return s + speckle(36, 44, 8, 8, 6, 1, '#3d6fb0', 3, 1) + rect(28, 34, 64, 20, 1, '#ffffff', '#9fb4c8', 0.6, ' opacity="0.35"');
    }, { w: 120, h: 86, roles: { primary: 'Glass', secondary: 'Grid', accent: 'Rails' } }),
  lb('microfluidic-chip', 'Microfluidic chip', ['microfluidics', 'chip', 'organ-on-chip', 'lab on a chip', 'droplets', 'single cell'], { primary: '#e8f2f8', secondary: '#4a8fe7', accent: '#e85d75' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary);
      const ch = 'M14 30 H40 Q46 30 46 36 V44 Q46 50 52 50 H80 M14 70 H40 Q46 70 46 64 V56 Q46 50 52 50 M80 50 Q90 50 90 40 V30 H106';
      let s = `<g transform="skewX(-12) translate(8 0)">` + defs(g) + rect(4, 14, 108, 74, 6, g.url, '#7f93a8', 1.6) + `<path d="${ch}" fill="none" stroke="${shade(c.secondary, -0.2)}" stroke-width="5" stroke-linecap="round"/><path d="${ch}" fill="none" stroke="${light(c.secondary, 0.35)}" stroke-width="3" stroke-linecap="round"/>`;
      s += [[14, 30], [14, 70], [106, 30]].map(([x, y]) => circle(x, y, 5, '#ffffff', c.secondary, 1.4)).join('') + [58, 66, 74].map((x) => circle(x, 50, 2, c.accent, shade(c.accent, -0.4), 0.6)).join('');
      return s + '</g>';
    }, { w: 120, h: 100, roles: { primary: 'Chip', secondary: 'Channels', accent: 'Droplets / cells' } }),
  lb('bioreactor', 'Bioreactor', ['bioreactor', 'fermenter', 'cell culture scale-up', 'manufacturing', 'perfusion', 'cho cells'], { primary: '#e8f2f8', secondary: '#9aa5b1', accent: '#f0c060' },
    (c, u) => {
      let s = glass(u, 'v', 'M24 20 H76 V82 Q76 94 64 94 H36 Q24 94 24 82 Z', 'M25.6 36 H74.4 V82 Q74.4 92.4 64 92.4 H36 Q25.6 92.4 25.6 82 Z', c.accent, c.primary);
      s += housing(u, 'l', 20, 12, 60, 10, c.secondary, 3) + rect(48, 2, 4, 76, 2, '#7b8794') + rect(38, 70, 24, 4, 2, '#52606d') + rect(42, 54, 16, 3, 1.5, '#52606d');
      [[30, 4], [66, 6]].forEach(([x, y]) => { s += rect(x, y, 4, 14, 1, '#7b8794'); });
      return s + speckle(50, 64, 20, 20, 20, 1.2, '#ffffff', 4, 0.8) + shine(28, 26, 56, 2.4);
    }, { roles: { primary: 'Vessel', secondary: 'Head plate', accent: 'Culture' } }),
  lb('iv-bag', 'IV bag (infusion)', ['iv bag', 'infusion', 'intravenous', 'drip', 'cell therapy product', 'car-t infusion'], { primary: '#eaf4fb', secondary: '#9aa5b1', accent: '#f39a6b' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary), lg = liquidGrad(u, 'l', c.accent);
      return defs(g, lg) + path('M26 10 H74 Q80 10 80 16 V64 Q80 76 68 80 H32 Q20 76 20 64 V16 Q20 10 26 10 Z', g.url, '#7f93a8', 1.6) + path('M21.6 30 H78.4 V64 Q78.4 74.6 68 78.4 H32 Q21.6 74.6 21.6 64 Z', lg.url, 'none', 0, ' opacity="0.9"')
        + circle(50, 16, 3, '#ffffff', c.secondary, 1.2) + rect(46, 80, 8, 8, 2, c.secondary, shade(c.secondary, -0.4), 1) + `<path d="M50 88 V98" stroke="${c.secondary}" stroke-width="2.4"/>` + rect(32, 38, 36, 20, 2, '#ffffff', '#9aa5b1', 0.8, ' opacity="0.9"') + shine(25, 16, 52, 2.4);
    }, { roles: { primary: 'Bag', secondary: 'Ports', accent: 'Contents' } }),
  lb('dissection-tools', 'Dissection tools', ['scissors', 'forceps', 'scalpel', 'dissection', 'surgery', 'necropsy', 'tissue harvest'], { primary: '#c9d1db', secondary: '#f39a6b', accent: '#7b8794' },
    (c, u) => {
      const g = capGradV(u, 'm', c.primary);
      let s = defs(g) + `<g transform="rotate(-35 40 50)">${path('M38 6 L42 6 L44 62 H36 Z', g.url, shade(c.primary, -0.42), 1.2)}${path('M46 6 L50 6 L52 62 H44 Z', g.url, shade(c.primary, -0.42), 1.2)}${circle(40, 74, 9, 'none', c.secondary, 3.4)}${circle(52, 72, 9, 'none', c.secondary, 3.4)}</g>`;
      s += `<g transform="rotate(30 76 50)">${path('M74 4 L78 4 L80 70 L76 92 L72 70 Z', g.url, shade(c.primary, -0.42), 1.2)}${path('M70 30 L74 4 L72 70 Z', shade(c.primary, -0.15), 'none')}</g>`;
      return s;
    }, { roles: { primary: 'Steel', secondary: 'Handles', accent: 'Accent' } }),
  lb('ice-bucket', 'Ice bucket', ['ice bucket', 'on ice', 'ice', 'sample handling', 'keep cold'], { primary: '#4a8fe7', secondary: '#eaf6fb', accent: '#f39a6b' },
    (c, u) => {
      const g = capGradV(u, 'b', c.primary);
      let s = vial(u, 'a', 34, 18, 10, 34, c.accent, '#f2c94c') + vial(u, 'b', 52, 22, 10, 34, '#7fd36b', c.primary);
      s += defs(g) + path('M12 44 H88 L82 92 Q80 96 76 96 H24 Q20 96 18 92 Z', g.url, shade(c.primary, -0.42), 1.6) + path('M14 44 Q30 36 50 44 T86 44 V48 H14 Z', c.secondary, '#9fc0d8', 1);
      return s + [[24, 42], [40, 40], [70, 41], [80, 43]].map(([x, y]) => rect(x - 4, y - 4, 8, 7, 1.6, '#ffffff', '#9fc0d8', 0.8, ` transform="rotate(${x % 30 - 15} ${x} ${y})"`)).join('');
    }, { roles: { primary: 'Bucket', secondary: 'Ice', accent: 'Tubes' } }),
  lb('lab-notebook', 'Lab notebook', ['lab notebook', 'notebook', 'protocol', 'records', 'notes', 'eln'], { primary: '#3d6fb0', secondary: '#f6f2e6', accent: '#e85d75' },
    (c, u) => {
      const g = caseGrad(u, 'c', c.primary);
      return defs(g) + rect(18, 6, 66, 88, 4, g.url, shade(c.primary, -0.42), 1.6) + rect(22, 8, 60, 84, 2, c.secondary, '#c9b48a', 0.8) + Array.from({ length: 8 }, (_, i) => line(30, 22 + i * 8, 74, 22 + i * 8, '#9fb4c8', 0.8)).join('')
        + Array.from({ length: 9 }, (_, i) => circle(18, 14 + i * 9.4, 2.4, 'none', '#7b8794', 1.4)).join('') + rect(76, 2, 6, 20, 1, c.accent) + `<path d="M76 22 L79 18 L82 22" fill="${c.accent}"/>`;
    }, { roles: { primary: 'Cover', secondary: 'Pages', accent: 'Bookmark' } }),
  lb('mouse-cage', 'Mouse cage', ['mouse cage', 'cage', 'vivarium', 'animal housing', 'ivc'], { primary: '#e8f2f8', secondary: '#7b8794', accent: '#f6e2b0' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary);
      let s = defs(g) + path('M10 30 H110 L104 90 H16 Z', g.url, '#7f93a8', 1.6) + path('M14 76 H106 L104 90 H16 Z', c.accent, shade(c.accent, -0.3), 1);
      s += speckle(60, 82, 40, 5, 30, 1.1, shade(c.accent, -0.2), 3, 1) + rect(8, 22, 104, 10, 3, '#c9d1db', c.secondary, 1.4);
      for (let x = 16; x < 106; x += 6) s += line(x, 22, x, 32, c.secondary, 1);
      return s + path('M70 70 C70 62 80 60 86 64 C90 66 92 70 88 72 Z', '#f1f3f5', '#9aa5b1', 1) + circle(87, 66, 0.9, '#1f2933') + shine(16, 36, 34, 2.4);
    }, { w: 120, h: 96, roles: { primary: 'Cage', secondary: 'Lid', accent: 'Bedding' } }),
  lb('magnetic-separation', 'Magnetic bead separation', ['magnetic beads', 'macs', 'cell isolation', 'magnet', 'bead separation', 'immunomagnetic', 'dynabeads'], { primary: '#9aa5b1', secondary: '#e05252', accent: '#8a5a2b' },
    (c, u) => {
      let s = vial(u, 't', 40, 14, 20, 70, '#f6e6c8', '#4a8fe7', { fill: 0.7 });
      const g = capGradV(u, 'm', c.primary);
      s += defs(g) + rect(10, 30, 22, 56, 3, g.url, shade(c.primary, -0.42), 1.4) + rect(68, 30, 22, 56, 3, g.url, shade(c.primary, -0.42), 1.4) + rect(10, 30, 22, 10, 3, c.secondary) + rect(68, 30, 22, 10, 3, '#4a8fe7');
      for (let i = 0; i < 10; i++) s += circle(42.6 + (i % 2) * 14.8, 40 + i * 3.4, 1.6, c.accent, shade(c.accent, -0.4), 0.5);
      return s;
    }, { roles: { primary: 'Magnet', secondary: 'Pole', accent: 'Beads' } }),
  lb('spin-column', 'Spin column', ['spin column', 'miniprep', 'purification kit', 'rna extraction', 'dna purification', 'silica column'], { primary: '#eef3f7', secondary: '#4a8fe7', accent: '#f6f2e6' },
    (c, u) => {
      let s = vial(u, 'o', 34, 30, 32, 66, '#eef3f7', c.primary, { fill: 0.12 });
      const gg = glassGrad(u, 'i', '#dce8f2');
      return s + defs(gg) + path('M38 14 H62 V60 L54 72 H46 L38 60 Z', gg.url, '#7f93a8', 1.2) + rect(39.4, 52, 21.2, 7, 1, c.accent, '#c9b48a', 0.8) + rect(36, 10, 28, 5, 2, c.secondary, shade(c.secondary, -0.4), 1) + shine(41, 18, 30, 1.8);
    }, { roles: { primary: 'Collection tube', secondary: 'Cap', accent: 'Silica membrane' } }),

  // ---- cell culture & assays -------------------------------------------------------------------------
  cu('culture-dish-cells', 'Culture dish with adherent cells', ['cell culture', 'adherent cells', 'monolayer', 'confluent', 'tissue culture dish', 'in vitro'], { primary: '#e8f2f8', secondary: '#f4c9d0', accent: '#e9b48a' },
    (c, u) => {
      const g = glassGrad(u, 'g', c.primary);
      let s = defs(g) + ellipse(50, 60, 46, 22, shade(c.primary, -0.1), '#7f93a8', 1.4) + rect(4, 44, 92, 16, 0, shade(c.primary, -0.1)) + ellipse(50, 44, 46, 22, g.url, '#7f93a8', 1.4) + ellipse(50, 46, 42, 18, c.secondary, 'none', 0, ' opacity="0.6"');
      const R = rng(4);
      for (let i = 0; i < 16; i++) { const a = R() * 6.28, d = Math.sqrt(R()), x = 50 + Math.cos(a) * 36 * d, y = 46 + Math.sin(a) * 15 * d; s += `<g transform="rotate(${n(R() * 180)} ${n(x)} ${n(y)})">${ellipse(x, y, 4.6, 1.8, c.accent, shade(c.accent, -0.4), 0.6)}${circle(x, y, 1, shade(c.accent, -0.45))}</g>`; }
      return s + `<path d="M14 36 Q30 26 52 26" fill="none" stroke="#fff" stroke-width="2" opacity="0.7" stroke-linecap="round"/>`;
    }, { w: 100, h: 84, roles: { primary: 'Dish', secondary: 'Medium', accent: 'Cells' } }),
  cu('transwell', 'Transwell insert', ['transwell', 'insert', 'migration assay', 'invasion assay', 'boyden chamber', 'co-culture', 'barrier model'], { primary: '#e8f2f8', secondary: '#f4c9d0', accent: '#62a8ea' },
    (c, u) => {
      let s = glass(u, 'w', 'M10 20 H90 V88 Q90 94 84 94 H16 Q10 94 10 88 Z', 'M11.6 46 H88.4 V88 Q88.4 92.4 84 92.4 H16 Q11.6 92.4 11.6 88 Z', c.secondary, c.primary);
      s += glass(u, 'i', 'M24 10 H76 V66 H24 Z', 'M25.4 30 H74.6 V64.6 H25.4 Z', light(c.secondary, 0.15), '#f2f7fb') + rect(16, 10, 68, 4, 1.4, '#c9d1db', '#7f93a8', 1) + `<path d="M24 66 H76" stroke="#7b8794" stroke-width="2" stroke-dasharray="1.4 1.2"/>`;
      return s + [30, 40, 50, 60, 70].map((x) => ellipse(x, 62, 4.4, 2.4, c.accent, shade(c.accent, -0.4), 0.6)).join('') + [36, 58].map((x) => ellipse(x, 70, 3, 2, c.accent, shade(c.accent, -0.4), 0.6)).join('');
    }, { roles: { primary: 'Well', secondary: 'Medium', accent: 'Cells' } }),
  cu('organoid', 'Organoid', ['organoid', 'intestinal organoid', 'mini-gut', '3d culture', 'matrigel', 'crypt budding', 'stem cell derived'], { primary: '#f2c4a0', secondary: '#6d4a9b', accent: '#f6e8c8' },
    (c, u) => {
      const outer = blob(50, 50, 40, 38, { n: 10, wobble: 0.16, seed: 7 });
      const inner = blob(50, 50, 22, 20, { n: 9, wobble: 0.15, seed: 7 });
      const g = sphere(u, 'b', c.primary, { hi: 0.4 });
      let s = defs(g, `<clipPath id="${u}-c"><path d="${outer}"/></clipPath>`) + path(outer, g.url, shade(c.primary, -0.42), 1.8) + path(inner, c.accent, shade(c.primary, -0.3), 1.4);
      let cells = '', nuc = '';
      for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; cells += line(50 + Math.cos(a) * 22, 50 + Math.sin(a) * 20, 50 + Math.cos(a) * 44, 50 + Math.sin(a) * 42, shade(c.primary, -0.25), 0.8); nuc += ellipse(50 + Math.cos(a + 0.1) * 31, 50 + Math.sin(a + 0.1) * 29, 2, 3.6, c.secondary, 'none', 0, ` transform="rotate(${n((a * 180) / Math.PI + 90)} ${n(50 + Math.cos(a + 0.1) * 31)} ${n(50 + Math.sin(a + 0.1) * 29)})" opacity="0.85"`); }
      s += `<g clip-path="url(#${u}-c)">${cells}${nuc}</g>` + speckle(50, 50, 14, 12, 8, 1.2, shade(c.accent, -0.3), 3, 0.8);
      return s + gloss(32, 26, 10, 5, 0.45);
    }, { roles: { primary: 'Epithelium', secondary: 'Nuclei', accent: 'Lumen' } }),
  cu('spheroid', 'Tumor spheroid', ['spheroid', 'tumor spheroid', '3d culture', 'cell aggregate', 'hanging drop', 'ultra-low attachment'], { primary: '#c47bc0', secondary: '#5b2a6e', accent: '#e8d0e6' },
    (c, u) => {
      const sh = round(50, 50, 44, 42, { seed: 3, wobble: 0.03 });
      const cells = pack(sh, [], 46, { rmin: 3.6, rmax: 7.4, seed: 5, margin: -2, gap: -0.6 });
      let s = '';
      cells.sort((a, b) => a.y - b.y).forEach((p, i) => { const g = sphere(u, `s${i}`, i % 5 ? c.primary : shade(c.primary, 0.12), { hi: 0.45 }); s += defs(g) + circle(p.x, p.y, p.r + 1.2, g.url, shade(c.primary, -0.42), 0.9); });
      return s + circle(50, 52, 12, shade(c.secondary, 0.1), 'none', 0, ' opacity="0.25"') + gloss(34, 30, 12, 6, 0.4);
    }, { roles: { primary: 'Cells', secondary: 'Necrotic core', accent: 'Accent' } }),
];
