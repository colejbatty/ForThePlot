// Small color utilities used by icons and the renderer. No dependencies.

const NAMED = {
  white: '#ffffff', black: '#000000', red: '#e53935', green: '#43a047', blue: '#1e88e5',
  orange: '#fb8c00', purple: '#8e24aa', yellow: '#fdd835', gray: '#9e9e9e', grey: '#9e9e9e',
  pink: '#ec407a', teal: '#00897b', cyan: '#00acc1', brown: '#795548', navy: '#1a237e',
  transparent: 'none', none: 'none',
};

export function normalizeColor(c, fallback = '#000000') {
  if (c == null || c === '') return fallback;
  const s = String(c).trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s.slice(1).split('').map((ch) => ch + ch).join('');
  if (/^#[0-9a-f]{8}$/.test(s)) return s.slice(0, 7);
  if (/^rgba?\(/.test(s)) {
    const n = s.match(/[\d.]+/g)?.map(Number) || [];
    if (n.length >= 3) return rgbToHex(n[0], n[1], n[2]);
  }
  return fallback;
}

export function hexToRgb(hex) {
  const h = normalizeColor(hex, '#000000');
  if (h === 'none') return { r: 0, g: 0, b: 0 };
  return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
}

export function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

export function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: hue(p, q, h + 1 / 3) * 255, g: hue(p, q, h) * 255, b: hue(p, q, h - 1 / 3) * 255 };
}

/** Lighten (amount > 0) or darken (amount < 0) a color. amount in [-1, 1]. */
export function shade(hex, amount) {
  const hsl = rgbToHsl(hexToRgb(hex));
  if (amount >= 0) hsl.l = hsl.l + (1 - hsl.l) * amount;
  else hsl.l = hsl.l * (1 + amount);
  const { r, g, b } = hslToRgb(hsl);
  return rgbToHex(r, g, b);
}

export function mix(a, b, t = 0.5) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Pick black or white text for a background. */
export function contrastText(bg) {
  if (!bg || bg === 'none') return '#1f2933';
  return luminance(bg) > 0.45 ? '#1f2933' : '#ffffff';
}

/** A curated palette that reads well for figures and on projectors. */
export const PALETTE = {
  blue: '#4a8fe7', sky: '#6cc3e8', teal: '#2fb39a', green: '#6abf59', lime: '#b5d334',
  yellow: '#f6c945', orange: '#f39a3d', red: '#e85d5d', pink: '#ee7fb4', magenta: '#c95fc0',
  purple: '#8c6bd6', indigo: '#5b6bd6', brown: '#a8775a', gray: '#9aa5b1', slate: '#52606d',
  ink: '#1f2933',
};
