// Build a standalone ForThePlot program (no Node.js install needed) as a Node single executable
// application, for apps that start MCP servers by command (Claude Science, Claude Code, others):
//
//   node scripts/build-exe.js [win-x64|linux-x64]   (default: win-x64)
//
// Output: dist/fortheplot-server-<platform>/ — the same layout as the Claude Desktop extension, with
//   server/fortheplot(.exe)   the program:  fortheplot.exe mcp | serve fig.json | export … (all CLI commands)
//   server/data/, assets/, packs/, dist/fortheplot.html, examples/, node_modules/@resvg/…
// and a zip of that folder next to it.
//
// The program is the official Node.js binary for the platform (from the npm registry package
// node-<platform>, the same version as the Node running this script) with ForThePlot injected.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2] || 'win-x64';
const isWin = target.startsWith('win');
const version = process.version.slice(1);
const work = path.join(root, 'build', `exe-${target}`);
const cache = path.join(root, 'build', 'cache');
const mcpbDir = path.join(root, 'build', 'mcpb');
const outDir = path.join(root, 'dist', `fortheplot-server-${target}`);
const exeName = isWin ? 'fortheplot.exe' : 'fortheplot';

if (!fs.existsSync(path.join(mcpbDir, 'manifest.json'))) {
  console.log('Building the Claude Desktop extension layout first…');
  execFileSync(process.execPath, [path.join(root, 'scripts/build-mcpb.js')], { stdio: 'inherit' });
}
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(cache, { recursive: true });

// 1. One CommonJS file. Inside the executable only built-in modules can be required, so the PNG
//    renderer's native addon is loaded from node_modules next to the program instead.
const resvgFromDisk = {
  name: 'resvg-from-disk',
  setup(build) {
    build.onResolve({ filter: /^@resvg\/resvg-js$/ }, () => ({ path: 'resvg', namespace: 'fortheplot-disk' }));
    build.onLoad({ filter: /.*/, namespace: 'fortheplot-disk' }, () => ({
      contents: "const m = require('node:module'), p = require('node:path');\n"
        + "module.exports = m.createRequire(p.join(p.dirname(process.execPath), 'x.js'))('@resvg/resvg-js');",
      loader: 'js',
    }));
  },
};
const bundle = path.join(work, 'fortheplot.cjs');
await esbuild.build({
  entryPoints: [path.join(root, 'src/cli/fortheplot.js')],
  outfile: bundle,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  minify: true,
  legalComments: 'none',
  plugins: [resvgFromDisk],
  define: { 'import.meta.url': '__fortheplot_url' },
  banner: { js: "var __fortheplot_url = require('node:url').pathToFileURL(process.execPath).href;" },
  logLevel: 'warning',
});

// 2. The blob Node injects into its own binary.
const blob = path.join(work, 'sea-prep.blob');
const seaConfig = path.join(work, 'sea-config.json');
fs.writeFileSync(seaConfig, JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true, useCodeCache: false, useSnapshot: false }));
execFileSync(process.execPath, ['--experimental-sea-config', seaConfig], { stdio: 'inherit' });

// 3. The official Node binary for the target platform, same version.
const pkg = `node-${target}`;
const tgz = path.join(cache, `${pkg}-${version}.tgz`);
if (!fs.existsSync(tgz)) {
  const file = execFileSync('npm', ['pack', `${pkg}@${version}`, '--silent', '--pack-destination', cache], { encoding: 'utf8' }).trim().split('\n').pop();
  fs.renameSync(path.join(cache, file), tgz);
}
const unpack = path.join(work, 'node');
fs.mkdirSync(unpack, { recursive: true });
execFileSync('tar', ['-xzf', tgz, '-C', unpack, '--strip-components=1']);
const nodeBin = path.join(unpack, 'bin', isWin ? 'node.exe' : 'node');
const exe = path.join(work, exeName);
fs.copyFileSync(nodeBin, exe);
if (isWin) {
  // drop Node's Authenticode signature, which injecting would invalidate anyway
  try { execFileSync('osslsigncode', ['remove-signature', '-in', exe, '-out', `${exe}.unsigned`], { stdio: 'ignore' }); fs.renameSync(`${exe}.unsigned`, exe); } catch { /* keep as is */ }
}

// 4. Inject.
execFileSync(path.join(root, 'node_modules/.bin/postject'), [exe, 'NODE_SEA_BLOB', blob, '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2', '--overwrite'], { stdio: 'ignore' });
if (!isWin) fs.chmodSync(exe, 0o755);

// 5. Lay out the folder: the extension's files, only this platform's PNG renderer, and the program.
fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(mcpbDir, outDir, { recursive: true });
for (const f of ['manifest.json', 'icon.png', path.join('server', 'fortheplot.mjs')]) fs.rmSync(path.join(outDir, f), { force: true });
const resvgDir = path.join(outDir, 'node_modules', '@resvg');
const keep = isWin ? 'resvg-js-win32-x64-msvc' : 'resvg-js-linux-x64-gnu';
for (const d of fs.readdirSync(resvgDir)) if (d !== 'resvg-js' && d !== keep) fs.rmSync(path.join(resvgDir, d), { recursive: true, force: true });
fs.copyFileSync(exe, path.join(outDir, 'server', exeName));
const pkgJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const archiveName = isWin ? `ForThePlot-server-${target}.zip` : `ForThePlot-server-${target}.tar.gz`;
fs.writeFileSync(path.join(outDir, 'README.txt'), [
  `ForThePlot ${pkgJson.version} — standalone server (${target}), no Node.js needed.`,
  '',
  ...(isWin ? [] : [
    'Install (Linux, or WSL on Windows). Sandboxed apps such as Claude Science can\'t see most of your',
    'home folder, so put it under /opt:',
    `  sudo mkdir -p /opt/fortheplot && sudo tar -xzf ${archiveName} -C /opt/fortheplot --strip-components=1 --no-same-owner`,
    '  /opt/fortheplot/server/fortheplot --version         checks it runs; the command below is /opt/fortheplot/server/fortheplot',
    '',
  ]),
  'Add it to an app that starts MCP servers by command, e.g. Claude Science:',
  '  Settings > Connectors > Add connector > Local command',
  `  Command:   <this folder>${isWin ? '\\server\\fortheplot.exe' : '/server/fortheplot'}   (the full path; no arguments needed)`,
  '  Environment (optional): FORTHEPLOT_DIR = folder for your figures',
  ...(isWin ? [] : ['  Under WSL, Windows paths such as C:\\Users\\you\\Figures are understood as /mnt/c/Users/you/Figures.']),
  '',
  `It also runs every ForThePlot command: ${exeName} serve figure.json, ${exeName} export figure.json -o figure.pdf, …`,
  'Keep the folder together: the program reads its icons, fonts and editor from here.',
  '',
].join(isWin ? '\r\n' : '\n'));

const zip = path.join(root, 'dist', archiveName);
fs.rmSync(zip, { force: true });
if (isWin) execFileSync('zip', ['-qr', zip, path.basename(outDir)], { cwd: path.dirname(outDir) });
else execFileSync('tar', ['-czf', zip, '--owner=0', '--group=0', path.basename(outDir)], { cwd: path.dirname(outDir) });
const mb = (p) => `${(fs.statSync(p).size / 1e6).toFixed(1)} MB`;
console.log(`${path.relative(root, outDir)}/server/${exeName}  ${mb(path.join(outDir, 'server', exeName))}`);
console.log(`${path.relative(root, zip)}  ${mb(zip)}`);
