#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const terser = require('terser');

const projectRoot = path.resolve(__dirname, '..');
const root = projectRoot;
const outputFile = path.join(projectRoot, 'dist/builtscript.js');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readYamlConfig(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    const doc = yaml.load(raw) || {};
    return doc;
  } catch (e) {
    console.error('Failed parsing flash.yaml:', e.message);
    process.exit(1);
  }
}

function copyFileIfExists(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(d));
      fs.copyFileSync(s, d);
    }
  }
}

function minimalNormalize(cfg) {
  const normalized = { background: {}, sections: [] };
  if (cfg && cfg.background) {
    if (typeof cfg.background.color === 'string') normalized.background.color = cfg.background.color;
    if (typeof cfg.background.image === 'string') normalized.background.image = cfg.background.image;
  }
  if (cfg && cfg.section && cfg.section.text) {
    const t = cfg.section.text;
    normalized.sections.push({
      type: 'text',
      content: typeof t.content === 'string' ? t.content : '',
      color: typeof t.color === 'string' ? t.color : undefined,
      style: t.style || {}
    });
  }
  return normalized;
}

function selectYamlSource() {
  const yml = path.join(projectRoot, 'flash.yml');
  const yamlPath = path.join(projectRoot, 'flash.yaml');
  if (fs.existsSync(yml)) return yml;
  if (fs.existsSync(yamlPath)) return yamlPath;
  return null;
}

async function buildStaticRuntime() {
  const jsyamlPath = path.join(projectRoot, 'node_modules', 'js-yaml', 'dist', 'js-yaml.min.js');
  if (!fs.existsSync(jsyamlPath)) {
    console.error('js-yaml browser build not found at', jsyamlPath);
    process.exit(1);
  }
  const lib = fs.readFileSync(jsyamlPath, 'utf8');
  const runtime = `(() => {\n  function fetchText(paths) {\n    if (!Array.isArray(paths)) paths = [paths];\n    let p = Promise.reject();\n    for (const u of paths) {\n      p = p.catch(() => fetch(u).then(r => { if (!r.ok) throw new Error('fetch failed'); return r.text(); }));\n    }\n    return p;\n  }\n  function normalizeColor(c) {\n    if (!c || typeof c !== 'string') return c;\n    const v = c.trim();\n    if (/^white$/i.test(v)) return '#FFFFFF';\n    if (/^#[0-9a-f]{3}$/i.test(v)) {\n      const m = v.slice(1).toUpperCase();\n      return '#' + m.split('').map(ch => ch + ch).join('');\n    }\n    if (/^#[0-9a-f]{6}$/i.test(v)) return '#' + v.slice(1).toUpperCase();\n    if (/^#[0-9a-f]{1,6}$/i.test(v)) {\n      let m = v.slice(1).toUpperCase();\n      while (m.length < 6) m += m[m.length - 1] || 'F';\n      return '#' + m.slice(0, 6);\n    }\n    return v;\n  }\n  function minimalNormalize(cfg) {\n    const normalized = { background: {}, sections: [] };\n    if (cfg && cfg.background) {\n      if (typeof cfg.background.color === 'string') normalized.background.color = cfg.background.color;\n      if (typeof cfg.background.image === 'string') normalized.background.image = cfg.background.image;\n    }\n    if (cfg && cfg.section && cfg.section.text) {\n      const t = cfg.section.text;\n      normalized.sections.push({\n        type: 'text',\n        content: typeof t.content === 'string' ? t.content : '',\n        color: typeof t.color === 'string' ? t.color : undefined,\n        style: t.style || {}\n      });\n    }\n    return normalized;\n  }\n  function applyBackground(cfg) {\n    const bg = cfg.background || {};\n    if (bg.color) document.body.style.backgroundColor = normalizeColor(bg.color);\n    if (bg.image) document.body.style.backgroundImage = 'url(' + bg.image + ')';\n  }\n  function renderSections(cfg) {\n    const sections = Array.isArray(cfg.sections) ? cfg.sections : [];\n    sections.forEach(s => {\n      if (s.type === 'text') {\n        const el = document.createElement('div');\n        el.textContent = s.content || '';\n        if (s.color) el.style.color = normalizeColor(s.color);\n        const st = s.style || {};\n        if (st.bold) el.style.fontWeight = '700';\n        const align = st.align || {};\n        if (align.horizontal === 'center') el.style.textAlign = 'center';\n        if (align.vertical === 'middle') {\n          el.style.display = 'flex';\n          el.style.minHeight = '100vh';\n          el.style.alignItems = 'center';\n          el.style.justifyContent = 'center';\n        }\n        document.body.appendChild(el);\n      }\n    });\n  }\n  function init() {\n    fetchText(['./flash.yml', './flash.yaml']).then(src => {\n      let parsed = {};\n      try {\n        parsed = (window.jsyaml || window.JSYAML || window.yaml || window.YAML).load(src) || {};\n      } catch (e) {\n        parsed = {};\n      }\n      const cfg = minimalNormalize(parsed);\n      applyBackground(cfg);\n      renderSections(cfg);\n    }).catch(() => {});\n  }\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', init);\n  } else {\n    init();\n  }\n})();`;
  const out = lib + '\n' + runtime;
  const min = await terser.minify(out, { compress: true, mangle: true });
  const finalCode = (min && min.code) ? min.code : out;
  ensureDir(path.dirname(outputFile));
  fs.writeFileSync(outputFile, finalCode);
}

function rewriteIndexToUseBuiltScript() {
  const rootIndex = path.join(projectRoot, 'index.html');
  if (!fs.existsSync(rootIndex)) return;
  let html = fs.readFileSync(rootIndex, 'utf8');
  if (html.includes('scripts/script.js')) {
    html = html.replace('scripts/script.js', 'builtscript.js');
    fs.writeFileSync(rootIndex, html);
  }
}

async function main() {
  await buildStaticRuntime();
  console.log('Built', outputFile);
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});

