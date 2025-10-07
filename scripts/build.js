#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const terser = require('terser');

const projectRoot = path.resolve(__dirname, '..');
const root = projectRoot;
const outputFile = path.join(projectRoot, 'dist/index.js');

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
  const runtimePath = path.join(projectRoot, 'scripts', 'runtime.js');
  if (!fs.existsSync(runtimePath)) {
    console.error('Missing scripts/runtime.js');
    process.exit(1);
  }
  const runtime = fs.readFileSync(runtimePath, 'utf8');
  const out = lib + '\n' + runtime;
  const min = await terser.minify(out, { compress: true, mangle: true });
  const finalCode = (min && min.code) ? min.code : out;
  const year = new Date().getFullYear();
  const banner = `/* © ${year} RHW, FLASH and everything all rights reserved */\n`;
  ensureDir(path.dirname(outputFile));
  fs.writeFileSync(outputFile, banner + finalCode);
}

function rewriteIndexToUseBuiltScript() {
  const rootIndex = path.join(projectRoot, 'index.html');
  if (!fs.existsSync(rootIndex)) return;
  let html = fs.readFileSync(rootIndex, 'utf8');
  if (html.includes('scripts/script.js')) {
    html = html.replace('scripts/script.js', 'index.js');
    fs.writeFileSync(rootIndex, html);
  }
  if (html.includes('builtscript.js')) {
    html = html.replace('builtscript.js', 'index.js');
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

