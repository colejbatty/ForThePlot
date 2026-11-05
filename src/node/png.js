// Node-only: rasterize SVG to PNG with resvg (no browser needed). Loaded lazily
// so everything else keeps working on systems without the native binary.
let mod = null;
let loadError = null;

export async function pngAvailable() {
  if (!mod && !loadError) {
    try { mod = await import('@resvg/resvg-js'); } catch (err) { loadError = err; }
  }
  return !!mod;
}

export async function svgToPng(svg, { scale = 1, width = 0, background = null } = {}) {
  if (!(await pngAvailable())) {
    throw new Error(`PNG rendering is unavailable here (${loadError?.message || 'resvg not installed'}). Export SVG instead.`);
  }
  const Resvg = mod.Resvg || mod.default?.Resvg;
  const opts = {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'zoom', value: scale },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  };
  if (background) opts.background = background;
  return new Resvg(svg, opts).render().asPng();
}

/** Rasterize to raw RGBA pixels (for TIFF). */
export async function svgToRgba(svg, { scale = 1, width = 0 } = {}) {
  if (!(await pngAvailable())) throw new Error(`Raster export is unavailable here (${loadError?.message || 'resvg not installed'}).`);
  const Resvg = mod.Resvg || mod.default?.Resvg;
  const img = new Resvg(svg, {
    fitTo: width ? { mode: 'width', value: width } : { mode: 'zoom', value: scale },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  }).render();
  return { pixels: img.pixels, width: img.width, height: img.height };
}
