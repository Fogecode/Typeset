#!/usr/bin/env node
/**
 * Offline verification harness.
 *
 * Loads the BUILT plugin main.js exactly the way Obsidian does:
 *   const PluginClass = require('main.js').default  (falling back to module.exports)
 * then drives the real export pipeline against the real vault.
 *
 * Exits non-zero on any failed assertion.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const os = require('os');

const args = process.argv.slice(2);
const pluginDir = args[0];
const vaultDir = args[1];
const noteRel = args[2] || 'index.md';
const outDir = args[3] || path.join(os.tmpdir(), 'hx-verify-out');

const results = [];
const ok = (name, extra) => results.push({ pass: true, name, extra });
const bad = (name, extra) => results.push({ pass: false, name, extra });
function check(name, cond, extra) { cond ? ok(name, extra) : bad(name, extra); }

const mockPath = path.join(__dirname, 'mock-obsidian.cjs');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request) {
  if (request === 'obsidian') return mockPath;
  if (request === 'electron') return path.join(__dirname, 'mock-electron.cjs');
  return origResolve.apply(this, arguments);
};

const obsidian = require(mockPath);

function buildApp(vaultRoot) {
  const fileCache = new Map();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.obsidian' || e.name === '.git' || e.name === 'node_modules') continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else fileCache.set(path.relative(vaultRoot, abs).replace(/\\/g, '/'), abs);
    }
  };
  walk(vaultRoot);

  const adapter = {
    getFullPath: (p) => path.join(vaultRoot, p),
    write: async (p, data) => {
      const abs = path.join(vaultRoot, p);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, data, 'utf8');
      fileCache.set(p.replace(/\\/g, '/'), abs);
    },
    read: async (p) => fs.readFileSync(path.join(vaultRoot, p), 'utf8'),
    exists: async (p) => fs.existsSync(path.join(vaultRoot, p)),
    mkdir: async (p) => fs.mkdirSync(path.join(vaultRoot, p), { recursive: true }),
  };

  const vault = {
    adapter,
    configDir: '.obsidian',
    getName: () => path.basename(vaultRoot),
    getAbstractFileByPath: (p) => {
      const norm = p.replace(/\\/g, '/');
      if (fileCache.has(norm)) return new obsidian.TFile(norm);
      const abs = path.join(vaultRoot, norm);
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return { path: norm, name: path.basename(norm), children: [] };
      return null;
    },
    getFiles: () => [...fileCache.keys()].map((p) => new obsidian.TFile(p)),
    getMarkdownFiles: () => [...fileCache.keys()].filter((p) => p.endsWith('.md')).map((p) => new obsidian.TFile(p)),
    cachedRead: async (f) => fs.readFileSync(path.join(vaultRoot, f.path), 'utf8'),
    read: async (f) => fs.readFileSync(path.join(vaultRoot, f.path), 'utf8'),
    readBinary: async (f) => {
      const b = fs.readFileSync(path.join(vaultRoot, f.path));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
    createFolder: async (p) => { fs.mkdirSync(path.join(vaultRoot, p), { recursive: true }); return { path: p }; },
    create: async (p, data) => { await adapter.write(p, data); return new obsidian.TFile(p); },
    modify: async (f, data) => adapter.write(f.path, data),
  };

  const metadataCache = {
    getFirstLinkpathDest: (linkpath) => {
      const target = linkpath.replace(/^\//, '');
      const candidates = [...fileCache.keys()];
      const exact = candidates.find((p) => p === target);
      if (exact) return new obsidian.TFile(exact);
      const byName = candidates.find((p) => p.endsWith('/' + target) || path.basename(p) === target);
      return byName ? new obsidian.TFile(byName) : null;
    },
    getFileCache: () => null,
    on: () => ({}),
    off: () => {},
  };

  const activeFile = new obsidian.TFile(noteRel.replace(/\\/g, '/'));
  const workspace = {
    getActiveFile: () => activeFile,
    getLeaf: () => ({ openFile: async () => {} }),
    on: () => ({}),
    off: () => {},
    onLayoutReady: (cb) => cb(),
    getLeavesOfType: () => [],
    revealLeaf: () => {},
  };

  return { vault, metadataCache, workspace };
}

(async () => {
  const entry = path.join(pluginDir, 'main.js');
  check('main.js exists', fs.existsSync(entry), entry);
  if (!fs.existsSync(entry)) { report(); return; }
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'manifest.json'), 'utf8'));
  check('manifest.json valid', !!manifest.id && !!manifest.version, manifest.id + '@' + manifest.version);

  let mod;
  try {
    mod = require(entry);
    ok('require(main.js) succeeds (Obsidian CJS load)');
  } catch (e) {
    bad('require(main.js) succeeds (Obsidian CJS load)', e.constructor.name + ': ' + e.message.split('\n')[0]);
    report();
    return;
  }

  const PluginClass = mod && mod.default ? mod.default : mod;
  check('exports a Plugin class', typeof PluginClass === 'function', typeof PluginClass);
  check('uses ES default export (mod.default present)', !!(mod && mod.default), 'keys=' + Object.keys(mod || {}).join(','));

  const app = buildApp(vaultDir);
  const plugin = new PluginClass(app, manifest);

  try {
    await plugin.onload();
    ok('plugin.onload() completes without throwing');
  } catch (e) {
    bad('plugin.onload() completes without throwing', e.constructor.name + ': ' + e.message.split('\n')[0]);
    report();
    return;
  }

  const cmds = plugin._commands || [];
  const ribbons = plugin._ribbons || [];
  const tabs = plugin._settingTabs || [];
  check('registers >=1 command', cmds.length >= 1, 'ids: ' + cmds.map((c) => c.id).join(', '));
  check('registers a ribbon icon', ribbons.length >= 1, ribbons.map((r) => r.title).join(', '));
  check('registers a settings tab', tabs.length >= 1);

  try { tabs[0].display(); ok('settings tab display() renders'); }
  catch (e) { bad('settings tab display() renders', e.constructor.name + ': ' + e.message.split('\n')[0]); }

  fs.mkdirSync(outDir, { recursive: true });
  obsidian.Notice.instances.length = 0;
  let htmlPath = null;
  try {
    if (typeof plugin.exportActiveNote === 'function') htmlPath = await plugin.exportActiveNote();
    else { const cmd = cmds.find((c) => c.id === 'export-active-note') || cmds[0]; htmlPath = await cmd.callback(); }
    ok('export runs via plugin command', String(htmlPath));
  } catch (e) {
    bad('export runs via plugin command', e.constructor.name + ': ' + e.message.split('\n')[0]);
  }

  const notices = obsidian.Notice.instances.map((n) => n.message);
  if (htmlPath) {
    const abs = path.isAbsolute(htmlPath) ? htmlPath : path.join(vaultDir, String(htmlPath));
    check('output file written', fs.existsSync(abs), abs);
    if (fs.existsSync(abs)) {
      const html = fs.readFileSync(abs, 'utf8');
      check('output is a full HTML document', /^<!DOCTYPE html>/i.test(html.trim()), html.length + ' bytes');
      check('has <title>', /<title>[^<]+<\/title>/i.test(html));
      check('zero external network assets', !/(src|href)\s*=\s*["']https?:\/\//i.test(html));
      const themeCount = (html.match(/data-theme="/g) || []).length;
      check('contains all 8 theme blocks', themeCount >= 8, 'data-theme matches: ' + themeCount);
      check('no leftover YAML frontmatter', !html.includes('title: ') || !html.includes('<p>---</p>'));
      const headings = (html.match(/<h[1-4][\s>]/g) || []).length;
      check('renders headings', headings >= 2, 'headings: ' + headings);
      check('no unrendered wikilinks', !html.includes('[['), 'contains [[ = ' + html.includes('[['));
      check('has inline <style>', /<style>/i.test(html));
      check('has inline <script>', /<script>/i.test(html));
      check('css variables wired', html.includes('--hx-'));
      fs.copyFileSync(abs, path.join(outDir, 'exported.html'));
    }
  }
  check('no error Notice raised', !notices.some((n) => /error|fail|cannot|undefined/i.test(n)), notices.join(' | '));

  report();

  function report() {
    const pass = results.filter((r) => r.pass).length;
    const fail = results.filter((r) => !r.pass);
    console.log('\n=== VERIFY REPORT ===');
    for (const r of results) console.log((r.pass ? '  PASS  ' : '  FAIL  ') + r.name + (r.extra ? '  [' + r.extra + ']' : ''));
    console.log('\n' + pass + ' passed, ' + fail.length + ' failed');
    if (fail.length) { console.log('\nFAILURES:'); fail.forEach((f) => console.log('  - ' + f.name + ': ' + (f.extra || ''))); process.exit(1); }
  }
})().catch((e) => { console.error('HARNESS CRASH:', e); process.exit(2); });
