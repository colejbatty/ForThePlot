// Build dist/ForThePlot.mcpb: a one-click Claude Desktop extension that runs on
// Claude's built-in Node.js, so users need neither Node nor npm.
//
//   node scripts/build-mcpb.js
//
// Layout inside the bundle:
//   manifest.json, icon.png, package.json, LICENSE
//   server/fortheplot.mjs          the CLI + MCP server, bundled with its dependencies
//   node_modules/@resvg/...     PNG renderer + native binaries for Windows, macOS, Linux
//   server/data/               pdfkit font metrics
//   assets/fonts/              Liberation Sans for vector PDF
//   packs/, examples/, dist/fortheplot.html
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const out = path.join(root, 'build', 'mcpb');
const cache = path.join(root, 'build', 'cache');
const RESVG_VERSION = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@resvg/resvg-js/package.json'), 'utf8')).version;
const PLATFORMS = ['win32-x64-msvc', 'win32-arm64-msvc', 'darwin-x64', 'darwin-arm64', 'linux-x64-gnu'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'server'), { recursive: true });
fs.mkdirSync(cache, { recursive: true });

// 1. Bundle the server
await esbuild.build({
  entryPoints: [path.join(root, 'src/cli/fortheplot.js')],
  outfile: path.join(out, 'server/fortheplot.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  minify: true,
  legalComments: 'none',
  external: ['@resvg/resvg-js'],
  // CommonJS dependencies (pdfkit) expect require and __dirname
  banner: { js: "import { createRequire as __cr } from 'node:module'; import { fileURLToPath as __fu } from 'node:url'; import { dirname as __dn } from 'node:path'; const require = __cr(import.meta.url); const __filename = __fu(import.meta.url); const __dirname = __dn(__filename);" },
  logLevel: 'warning',
});

// 2. Data the server reads at runtime
const copy = (from, to = from) => fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true });
copy('packs');
copy('dist/fortheplot.html');
copy('assets/fonts');                              // Liberation Sans for vector PDF (SIL OFL)
copy('node_modules/pdfkit/js/data', 'server/data'); // pdfkit's standard font metrics, read from __dirname/data
copy('LICENSE');
fs.mkdirSync(path.join(out, 'examples'));
for (const f of fs.readdirSync(path.join(root, 'examples')).filter((x) => x.endsWith('.json'))) copy(`examples/${f}`);
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ name: 'fortheplot', version: pkg.version, type: 'module', private: true, license: 'MIT' }, null, 2));

// 3. PNG renderer with native binaries for each platform
const resvgDir = path.join(out, 'node_modules/@resvg');
fs.mkdirSync(resvgDir, { recursive: true });
fs.cpSync(path.join(root, 'node_modules/@resvg/resvg-js'), path.join(resvgDir, 'resvg-js'), { recursive: true });
for (const plat of PLATFORMS) {
  const name = `@resvg/resvg-js-${plat}`;
  const tgz = path.join(cache, `resvg-js-${plat}-${RESVG_VERSION}.tgz`);
  if (!fs.existsSync(tgz)) {
    const file = execFileSync('npm', ['pack', `${name}@${RESVG_VERSION}`, '--silent', '--pack-destination', cache], { encoding: 'utf8' }).trim().split('\n').pop();
    fs.renameSync(path.join(cache, file), tgz);
  }
  const dest = path.join(resvgDir, `resvg-js-${plat}`);
  fs.mkdirSync(dest, { recursive: true });
  execFileSync('tar', ['-xzf', tgz, '-C', dest, '--strip-components=1']);
}

// 4. Icon
const { svgToPng } = await import('../src/node/png.js');
// a small plot: axes and three rising bars with error bars
const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="256" height="256"><rect width="64" height="64" rx="14" fill="#0f6b73"/><path d="M14 12v38h38" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="20" y="36" width="7" height="11" rx="1.5" fill="#ffffff"/><rect x="31" y="28" width="7" height="19" rx="1.5" fill="#ffffff"/><rect x="42" y="18" width="7" height="29" rx="1.5" fill="#ff7aa8"/><path d="M23.5 36v-6M20.5 30h6M34.5 28v-7M31.5 21h6M45.5 18v-7M42.5 11h6" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/></svg>';
fs.writeFileSync(path.join(out, 'icon.png'), await svgToPng(iconSvg, { width: 256 }));

// 5. Manifest
const manifest = {
  manifest_version: '0.3',
  name: 'fortheplot',
  display_name: 'ForThePlot (4tP): scientific figures',
  version: pkg.version,
  description: 'Draw immunology and biology figures (BioRender-style) and open them in a live editor you can keep editing.',
  long_description: 'ForThePlot lets Claude create and edit scientific illustrations as JSON figure files: 562 original, recolorable icons (about 185 human cell types across every body system, immune cell states, antibody formats, receptors and signaling, molecules and drug carriers, genetics and gene editing, microbes, organelles, organs and microanatomy, model organisms, lab equipment and charts), 2,256 recolorable Bioicons with their licenses tracked, membranes, arrows that stay attached, and templates. Building blocks draw an immune synapse, a signaling pathway, an experiment timeline or a gating strategy in one step; lettered panels lay out multi-part figures; drawn paths become curved membranes or cells of any shape; micrographs, blots and flow plots go in with a scale bar; GraphPad Prism graphs stay linked to their Prism file (double-click to edit in Prism, and the figure updates when you save). Claude can render a preview to check its layout and open the same file in a local editor; your edits, selection and sticky notes reach Claude, and its edits appear live in your browser. Export journal-ready PDF, TIFF, PNG, SVG or PowerPoint at Nature or JCI sizes, with a credit line for the legend.',
  author: { name: 'ForThePlot contributors', url: 'https://github.com/colejbatty/fortheplot' },
  homepage: 'https://github.com/colejbatty/fortheplot',
  repository: { type: 'git', url: 'https://github.com/colejbatty/fortheplot.git' },
  support: 'https://github.com/colejbatty/fortheplot/issues',
  license: 'MIT',
  keywords: ['biology', 'immunology', 'figures', 'illustration', 'svg', 'biorender'],
  icon: 'icon.png',
  server: {
    type: 'node',
    entry_point: 'server/fortheplot.mjs',
    mcp_config: {
      command: 'node',
      args: ['${__dirname}/server/fortheplot.mjs', 'mcp'],
      env: { FORTHEPLOT_DIR: '${user_config.figures_dir}', FORTHEPLOT_ROOT: '${__dirname}', FORTHEPLOT_PRISM: '${user_config.prism_path}' },
    },
  },
  tools: [
    { name: 'search_icons', description: 'Find icons by keyword (cells, receptors, antibodies, Bioicons…)' },
    { name: 'new_figure', description: 'Create a figure file, optionally from a template' },
    { name: 'open_figure', description: 'Open an existing figure file' },
    { name: 'describe_figure', description: 'List elements and layout warnings' },
    { name: 'edit_figure', description: 'Apply ops (add, connect, attach, arrange, align…) atomically' },
    { name: 'add_icon', description: 'Add one icon' },
    { name: 'connect', description: 'Draw an arrow between elements' },
    { name: 'render_figure', description: 'Render a PNG preview to check the layout' },
    { name: 'export_figure', description: 'Write PDF, TIFF, PNG, SVG, PowerPoint or JSON, at a journal size' },
    { name: 'add_block', description: 'Draw a synapse, pathway, timeline or gating strategy in one step' },
    { name: 'add_image', description: 'Put a micrograph, blot or flow plot from a file into the figure' },
    { name: 'add_prism_graph', description: 'Add a GraphPad Prism graph that stays linked to its Prism file' },
    { name: 'list_prism_graphs', description: 'List the graphs in a Prism file by number and name' },
    { name: 'refresh_links', description: 'Update linked graphs whose source changed' },
    { name: 'open_in_prism', description: 'Open a linked graph in Prism' },
    { name: 'save_as_icon', description: 'Save objects from a figure as a reusable icon in My icons' },
    { name: 'get_selection', description: 'See what the person selected in the editor, and their sticky notes' },
    { name: 'open_editor', description: 'Open the figure in the live local editor' },
  ],
  user_config: {
    prism_path: {
      type: 'file',
      title: 'GraphPad Prism program (optional)',
      description: 'Only needed if Prism is not installed in Program Files\\GraphPad. Lets ForThePlot export linked Prism graphs.',
      required: false,
    },
    figures_dir: {
      type: 'directory',
      title: 'Figures folder',
      description: 'Where figures are saved. Relative paths Claude uses are resolved here.',
      required: false,
      default: '${DOCUMENTS}/ForThePlot',
    },
  },
  compatibility: { platforms: ['win32', 'darwin', 'linux'], runtimes: { node: '>=18.0.0' } },
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 6. Validate and pack
const mcpb = path.join(root, 'node_modules/.bin/mcpb');
execFileSync(mcpb, ['validate', path.join(out, 'manifest.json')], { stdio: 'inherit' });
const target = path.join(root, 'dist', 'ForThePlot.mcpb');
fs.rmSync(target, { force: true });
execFileSync(mcpb, ['pack', out, target], { stdio: 'inherit' });
console.log(`\n${path.relative(root, target)}  ${(fs.statSync(target).size / 1e6).toFixed(1)} MB`);
