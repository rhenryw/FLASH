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
  const runtime = `(() => {\n  function fetchText(paths) {\n    if (!Array.isArray(paths)) paths = [paths];\n    let p = Promise.reject();\n    for (const u of paths) {\n      p = p.catch(() => fetch(u).then(r => { if (!r.ok) throw new Error('fetch failed'); return r.text(); }));\n    }\n    return p;\n  }\n  function normalizeColor(c) {\n    if (!c || typeof c !== 'string') return c;\n    const v = c.trim();\n    if (/^white$/i.test(v)) return '#FFFFFF';\n    if (/^#[0-9a-f]{3}$/i.test(v)) {\n      const m = v.slice(1).toUpperCase();\n      return '#' + m.split('').map(ch => ch + ch).join('');\n    }\n    if (/^#[0-9a-f]{6}$/i.test(v)) return '#' + v.slice(1).toUpperCase();\n    if (/^#[0-9a-f]{1,6}$/i.test(v)) {\n      let m = v.slice(1).toUpperCase();\n      while (m.length < 6) m += m[m.length - 1] || 'F';\n      return '#' + m.slice(0, 6);\n    }\n    return v;\n  }\n  function minimalNormalize(cfg) {\n    const normalized = { background: {}, metadata: {}, sections: [] };\n    if (cfg && cfg.background) {\n      if (typeof cfg.background.color === 'string') normalized.background.color = cfg.background.color;\n      if (typeof cfg.background.image === 'string') normalized.background.image = cfg.background.image;\n    }\n    if (cfg && cfg.metadata && typeof cfg.metadata === 'object') {\n      normalized.metadata = cfg.metadata;\n    }\n    if (cfg && cfg.section && typeof cfg.section === 'object') {\n      const sectionObj = cfg.section;\n      Object.keys(sectionObj).forEach(k => {\n        if (k === 'text') {\n          const t = sectionObj[k] || {};\n          normalized.sections.push({ type: 'text', content: typeof t.content === 'string' ? t.content : '', color: typeof t.color === 'string' ? t.color : undefined, style: t.style || {} });\n        } else {\n          normalized.sections.push({ type: 'bit', name: k, config: sectionObj[k] });\n        }\n      });\n    }\n    if (Array.isArray(cfg && cfg.sections)) {\n      for (const s of cfg.sections) {\n        if (!s) continue;\n        if (typeof s === 'object' && s.type === 'text') {\n          const t = s;\n          normalized.sections.push({ type: 'text', content: typeof t.content === 'string' ? t.content : '', color: typeof t.color === 'string' ? t.color : undefined, style: t.style || {} });\n          continue;\n        }\n        if (typeof s === 'object' && s.type && s.type !== 'text') {\n          const name = String(s.type);\n          const conf = s.config || s.options || s;\n          normalized.sections.push({ type: 'bit', name, config: conf });\n          continue;\n        }\n        if (typeof s === 'object') {\n          const keys = Object.keys(s);\n          if (keys.length === 1) {\n            const name = keys[0];\n            if (name === 'text') {\n              const t = s[name] || {};\n              normalized.sections.push({ type: 'text', content: typeof t.content === 'string' ? t.content : '', color: typeof t.color === 'string' ? t.color : undefined, style: t.style || {} });\n            } else {\n              normalized.sections.push({ type: 'bit', name, config: s[name] });\n            }\n          }\n        }\n      }\n    }\n    return normalized;\n  }\n  function applyBackground(cfg) {\n    const bg = cfg.background || {};\n    if (bg.color) document.body.style.backgroundColor = normalizeColor(bg.color);\n    if (bg.image) document.body.style.backgroundImage = 'url(' + bg.image + ')';\n  }\n  function applyMetadata(meta) {\n    if (!meta || typeof meta !== 'object') return;\n    if (typeof meta.title === 'string') document.title = meta.title;\n    const head = document.head || document.getElementsByTagName('head')[0];\n    const ensure = (sel, create) => {\n      let el = head.querySelector(sel);\n      if (!el) { el = create(); head.appendChild(el); }\n      return el;\n    };\n    if (typeof meta.description === 'string') {\n      const el = ensure('meta[name="description"]', () => document.createElement('meta'));\n      el.setAttribute('name', 'description');\n      el.setAttribute('content', meta.description);\n    }\n    if (typeof meta.author === 'string') {\n      const el = ensure('meta[name="author"]', () => document.createElement('meta'));\n      el.setAttribute('name', 'author');\n      el.setAttribute('content', meta.author);\n    }\n    if (typeof meta.image === 'string') {\n      const el = ensure('meta[property="og:image"]', () => document.createElement('meta'));\n      el.setAttribute('property', 'og:image');\n      el.setAttribute('content', meta.image);\n    }\n    if (typeof meta.title === 'string') {\n      const el = ensure('meta[property="og:title"]', () => document.createElement('meta'));\n      el.setAttribute('property', 'og:title');\n      el.setAttribute('content', meta.title);\n    }\n    if (typeof meta.description === 'string') {\n      const el = ensure('meta[property="og:description"]', () => document.createElement('meta'));\n      el.setAttribute('property', 'og:description');\n      el.setAttribute('content', meta.description);\n    }\n  }\n  const bitDefCache = {};\n  const bitCssApplied = {};\n  function fetchBitYaml(name) {\n    const base = 'https://raw.githubusercontent.com/rhenryw/FLASH/main/bits/';\n    return fetchText([base + name + '.yaml', base + name + '.yml']);\n  }\n  function loadBitDefinition(name) {\n    if (bitDefCache[name]) return Promise.resolve(bitDefCache[name]);\n    return fetchBitYaml(name).then(src => {\n      let parsed = {};\n      try {\n        parsed = (window.jsyaml || window.JSYAML || window.yaml || window.YAML).load(src) || {};\n      } catch (e) {\n        parsed = {};\n      }\n      bitDefCache[name] = parsed;\n      return parsed;\n    });\n  }\n  function applyBitCss(name, css) {\n    if (!css || bitCssApplied[name]) return;\n    const style = document.createElement('style');\n    style.setAttribute('data-bit', name);\n    style.textContent = css;\n    document.head.appendChild(style);\n    bitCssApplied[name] = true;\n  }\n  function executeBitJs(name, jsCode, ctx) {\n    if (!jsCode) return;\n    const fn = new Function('ctx', jsCode);\n    try { fn(ctx); } catch (e) {}\n  }\n  function applyCustom(cfg) {\n    const c = cfg.custom || {};\n    if (c && typeof c.css === 'string' && c.css.trim()) {\n      const style = document.createElement('style');\n      style.textContent = c.css;\n      document.head.appendChild(style);\n    }\n    if (c && typeof c.js === 'string' && c.js.trim()) {\n      try { new Function(c.js)(); } catch (e) {}\n    }\n  }\n  function renderTextInto(parent, s) {\n    const el = document.createElement('div');\n    el.textContent = s.content || '';\n    if (s.color) el.style.color = normalizeColor(s.color);\n    const st = s.style || {};\n    if (st.bold) el.style.fontWeight = '700';\n    const align = st.align || {};\n    if (align.horizontal === 'center') el.style.textAlign = 'center';\n    if (align.vertical === 'middle') {\n      el.style.display = 'flex';\n      el.style.minHeight = '100vh';\n      el.style.alignItems = 'center';\n      el.style.justifyContent = 'center';\n    }\n    parent.appendChild(el);\n  }\n  function renderBitSection(meta, section, container) {\n    const name = section.name;\n    return loadBitDefinition(name).then(def => {\n      applyBitCss(name, def && (def.CSS || def.css));\n      const ctx = {\n        container,\n        config: section.config || {},\n        metadata: meta || {},\n        utils: { normalizeColor }\n      };\n      const jsCode = def && (def.JS || def.js);\n      executeBitJs(name, jsCode, ctx);\n    }).catch(() => {});\n  }\n  function renderSections(cfg) {\n    const sections = Array.isArray(cfg.sections) ? cfg.sections : [];\n    const jobs = [];\n    sections.forEach(s => {\n      if (s.type === 'text') {\n        const holder = document.createElement('div');\n        if (s.id) holder.id = s.id;\n        document.body.appendChild(holder);\n        renderTextInto(holder, s);\n      } else if (s.type === 'bit' && s.name) {\n        const container = document.createElement('div');\n        container.setAttribute('data-bit', s.name);\n        if (s.config && typeof s.config.id === 'string') container.id = s.config.id;\n        document.body.appendChild(container);\n        jobs.push(renderBitSection(cfg.metadata || {}, s, container));\n      }\n    });\n    return Promise.all(jobs);\n  }\n  function init() {\n    fetchText(['./flash.yml', './flash.yaml']).then(src => {\n      let parsed = {};\n      try {\n        parsed = (window.jsyaml || window.JSYAML || window.yaml || window.YAML).load(src) || {};\n      } catch (e) {\n        parsed = {};\n      }\n      const cfg = minimalNormalize(parsed);\n      applyBackground(cfg);\n      applyMetadata(cfg.metadata);\n      applyCustom(cfg);\n      try { document.documentElement.style.scrollBehavior = 'smooth'; } catch (e) {}\n      return renderSections(cfg);\n    }).catch(() => {});\n  }\n  if (document.readyState === 'loading') {\n    document.addEventListener('DOMContentLoaded', init);\n  } else {\n    init();\n  }\n})();`;
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

