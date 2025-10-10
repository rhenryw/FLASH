(() => {
  function switchSourceImpl(path) {
    try {
      const el = document.querySelector('flash[src]') || document.querySelector('flash');
      if (!el) return;
      if (!el.getAttribute('src')) {
        el.textContent = '';
      }
      el.setAttribute('src', String(path || ''));
    } catch (e) {}
  }
  function fetchText(paths) {
    if (!Array.isArray(paths)) paths = [paths];
    let p = Promise.reject();
    const addBust = (u) => {
      try {
        const url = new URL(u, window.location.href);
        url.searchParams.set('_', String(Date.now()));
        return url.toString();
      } catch (e) {
        const sep = u.indexOf('?') === -1 ? '?' : '&';
        return u + sep + '_=' + String(Date.now());
      }
    };
    for (const u of paths) {
      const ub = addBust(u);
      p = p.catch(() => fetch(ub, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } }).then(r => { if (!r.ok) throw new Error('fetch failed'); return r.text(); }));
    }
    return p;
  }
  function normalizeColor(c) {
    if (!c || typeof c !== 'string') return c;
    const v = c.trim();
    if (/^white$/i.test(v)) return '#FFFFFF';
    if (/^#[0-9a-f]{3}$/i.test(v)) {
      const m = v.slice(1).toUpperCase();
      return '#' + m.split('').map(ch => ch + ch).join('');
    }
    if (/^#[0-9a-f]{6}$/i.test(v)) return '#' + v.slice(1).toUpperCase();
    if (/^#[0-9a-f]{1,6}$/i.test(v)) {
      let m = v.slice(1).toUpperCase();
      while (m.length < 6) m += m[m.length - 1] || 'F';
      return '#' + m.slice(0, 6);
    }
    return v;
  }
  function minimalNormalize(cfg) {
    const normalized = { background: {}, metadata: {}, sections: [] };
    if (cfg && cfg.background) {
      if (typeof cfg.background.color === 'string') normalized.background.color = cfg.background.color;
      if (typeof cfg.background.image === 'string') normalized.background.image = cfg.background.image;
    }
    if (cfg && cfg.metadata && typeof cfg.metadata === 'object') {
      normalized.metadata = cfg.metadata;
    }
    if (cfg && cfg.section && typeof cfg.section === 'object') {
      const sectionObj = cfg.section;
      Object.keys(sectionObj).forEach(k => {
        if (k === 'text') {
          const t = sectionObj[k] || {};
          normalized.sections.push({ type: 'text', content: typeof t.content === 'string' ? t.content : '', color: typeof t.color === 'string' ? t.color : undefined, style: t.style || {} });
        } else {
          normalized.sections.push({ type: 'bit', name: k, config: sectionObj[k] });
        }
      });
    }
    if (Array.isArray(cfg && cfg.sections)) {
      for (const s of cfg.sections) {
        if (!s) continue;
        if (typeof s === 'object' && s.type === 'text') {
          const t = s;
          normalized.sections.push({ type: 'text', content: typeof t.content === 'string' ? t.content : '', color: typeof t.color === 'string' ? t.color : undefined, style: t.style || {} });
          continue;
        }
        if (typeof s === 'object' && s.type && s.type !== 'text') {
          const name = String(s.type);
          const conf = s.config || s.options || s;
          normalized.sections.push({ type: 'bit', name, config: conf });
          continue;
        }
        if (typeof s === 'object') {
          const keys = Object.keys(s);
          if (keys.length === 1) {
            const name = keys[0];
            if (name === 'text') {
              const t = s[name] || {};
              normalized.sections.push({ type: 'text', content: typeof t.content === 'string' ? t.content : '', color: typeof t.color === 'string' ? t.color : undefined, style: t.style || {} });
            } else {
              normalized.sections.push({ type: 'bit', name, config: s[name] });
            }
          }
        }
      }
    }
    return normalized;
  }
  function applyBackground(cfg) {
    const bg = cfg.background || {};
    if (bg.color) document.body.style.backgroundColor = normalizeColor(bg.color);
    if (bg.image) document.body.style.backgroundImage = 'url(' + bg.image + ')';
  }
  function applyMetadata(meta) {
    if (!meta || typeof meta !== 'object') return;
    if (typeof meta.title === 'string') document.title = meta.title;
    const head = document.head || document.getElementsByTagName('head')[0];
    const ensure = (sel, create) => {
      let el = head.querySelector(sel);
      if (!el) { el = create(); head.appendChild(el); }
      return el;
    };
    if (typeof meta.description === 'string') {
      const el = ensure('meta[name="description"]', () => document.createElement('meta'));
      el.setAttribute('name', 'description');
      el.setAttribute('content', meta.description);
    }
    if (typeof meta.author === 'string') {
      const el = ensure('meta[name="author"]', () => document.createElement('meta'));
      el.setAttribute('name', 'author');
      el.setAttribute('content', meta.author);
    }
    if (typeof meta.image === 'string') {
      const el = ensure('meta[property="og:image"]', () => document.createElement('meta'));
      el.setAttribute('property', 'og:image');
      el.setAttribute('content', meta.image);
    }
    if (typeof meta.title === 'string') {
      const el = ensure('meta[property="og:title"]', () => document.createElement('meta'));
      el.setAttribute('property', 'og:title');
      el.setAttribute('content', meta.title);
    }
    if (typeof meta.description === 'string') {
      const el = ensure('meta[property="og:description"]', () => document.createElement('meta'));
      el.setAttribute('property', 'og:description');
      el.setAttribute('content', meta.description);
    }
  }
  const bitDefCache = {};
  const bitCssApplied = {};
  let bitSources = [];
  function ensureSlash(u) {
    if (typeof u !== 'string') return '';
    return u.endsWith('/') ? u : (u + '/');
  }
  function setBitSources(bitsCfg) {
    const list = [];
    if (bitsCfg && Array.isArray(bitsCfg.sources)) {
      for (const s of bitsCfg.sources) {
        if (typeof s === 'string') { list.push(ensureSlash(s)); continue; }
        if (s && typeof s === 'object') {
          if (s.url && typeof s.url === 'string') { list.push(ensureSlash(s.url)); continue; }
          if (s.github && typeof s.github === 'object') {
            const repo = String(s.github.repo || '').trim();
            if (repo) {
              const ref = String(s.github.ref || 'main');
              const p = ensureSlash(String(s.github.path || 'bits'));
              list.push(ensureSlash('https://raw.githubusercontent.com/' + repo + '/' + ref + '/' + p));
              continue;
            }
          }
          if (s.local) {
            const base = typeof s.local === 'string' ? s.local : (s.base || './bits/');
            list.push(ensureSlash(base));
            continue;
          }
          if (s.base && typeof s.base === 'string') { list.push(ensureSlash(s.base)); continue; }
        }
      }
    }
    if (list.length === 0) {
      list.push(ensureSlash('./bits/'));
      list.push(ensureSlash('https://raw.githubusercontent.com/rhenryw/FLASH/main/bits'));
    }
    bitSources = list;
  }
  function fetchBitYaml(name) {
    const paths = [];
    for (const base of bitSources) {
      paths.push(base + name + '.yaml');
      paths.push(base + name + '.yml');
    }
    return fetchText(paths);
  }
  function loadBitDefinition(name) {
    if (bitDefCache[name]) return Promise.resolve(bitDefCache[name]);
    return fetchBitYaml(name).then(src => {
      let parsed = {};
      try {
        parsed = (window.jsyaml || window.JSYAML || window.yaml || window.YAML).load(src) || {};
      } catch (e) {
        parsed = {};
      }
      bitDefCache[name] = parsed;
      return parsed;
    });
  }
  function applyBitCss(name, css) {
    if (!css || bitCssApplied[name]) return;
    const style = document.createElement('style');
    style.setAttribute('data-bit', name);
    style.textContent = css;
    document.head.appendChild(style);
    bitCssApplied[name] = true;
  }
  function executeBitJs(name, jsCode, ctx) {
    if (!jsCode) return;
    const fn = new Function('ctx', jsCode);
    try { fn(ctx); } catch (e) {}
  }
  function applyCustom(cfg) {
    const c = cfg.custom || {};
    if (c && typeof c.css === 'string' && c.css.trim()) {
      const style = document.createElement('style');
      style.textContent = c.css;
      document.head.appendChild(style);
    }
    if (c && typeof c.js === 'string' && c.js.trim()) {
      try { new Function(c.js)(); } catch (e) {}
    }
  }
  function renderTextInto(parent, s) {
    const el = document.createElement('div');
    el.textContent = s.content || '';
    if (s.color) el.style.color = normalizeColor(s.color);
    const st = s.style || {};
    if (st.bold) el.style.fontWeight = '700';
    const align = s.style && s.style.align ? s.style.align : {};
    if (align.horizontal === 'center') el.style.textAlign = 'center';
    if (align.vertical === 'middle') {
      el.style.display = 'flex';
      el.style.minHeight = '100vh';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
    }
    parent.appendChild(el);
  }
  function renderBitSection(meta, section, container) {
    const name = section.name;
    if (name === 'frame') {
      const cfg = section.config || {};
      const srcVal = typeof cfg === 'string' ? cfg : (cfg.src || cfg.url || cfg.path || '');
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.border = '0';
      iframe.style.display = 'block';
      const h = typeof cfg.height === 'number' ? (cfg.height + 'px') : (cfg.height || '100vh');
      iframe.style.height = h;
      const sandbox = cfg.sandbox;
      if (typeof sandbox === 'string') iframe.setAttribute('sandbox', sandbox);
      const allow = cfg.allow;
      if (typeof allow === 'string') iframe.setAttribute('allow', allow);
      if (/\.ya?ml(\?|#|$)/i.test(srcVal)) {
        const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1" />\n<script src="https://cdn.jsdelivr.net/gh/rhenryw/cdns@main/src/index.min.js"></script>\n<script cdn="rhenryw/flash/dist/index.min.js lg=0 ref=main" defer></script></head><body><flash src="' + srcVal.replace(/"/g, '&quot;') + '"></flash></body></html>';
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        iframe.src = url;
      } else {
        iframe.src = srcVal;
      }
      container.appendChild(iframe);
      return Promise.resolve();
    }
    return loadBitDefinition(name).then(def => {
      applyBitCss(name, def && (def.CSS || def.css));
      const ctx = {
        container,
        config: section.config || {},
        metadata: meta || {},
        utils: { normalizeColor, switchSource: switchSourceImpl }
      };
      const jsCode = def && (def.JS || def.js);
      executeBitJs(name, jsCode, ctx);
    }).catch(() => {});
  }
  function renderSections(root, cfg) {
    const sections = Array.isArray(cfg.sections) ? cfg.sections : [];
    const jobs = [];
    sections.forEach(s => {
      if (s.type === 'text') {
        const holder = document.createElement('div');
        if (s.id) holder.id = s.id;
        root.appendChild(holder);
        renderTextInto(holder, s);
      } else if (s.type === 'bit' && s.name) {
        const container = document.createElement('div');
        container.setAttribute('data-bit', s.name);
        if (s.config && typeof s.config.id === 'string') container.id = s.config.id;
        root.appendChild(container);
        jobs.push(renderBitSection(cfg.metadata || {}, s, container));
      }
    });
    return Promise.all(jobs);
  }
  function maybeRemapByParams(el, parsed, currentSrc) {
    const map = (parsed && (parsed.Params || parsed.params)) || null;
    if (!map || typeof map !== 'object') return false;
    const params = new URLSearchParams(String(window.location.search || ''));
    let dest = '';
    for (const key of Object.keys(map)) {
      const val = params.get(key);
      if (val == null) continue;
      const entry = map[key];
      if (typeof entry === 'string') { dest = entry; break; }
      if (entry && typeof entry === 'object') {
        if (typeof entry[val] === 'string') { dest = entry[val]; break; }
        if (typeof entry.default === 'string') { dest = entry.default; break; }
      }
    }
    if (dest && dest !== currentSrc) {
      el.removeAttribute('data-flash-done');
      el.setAttribute('src', dest);
      return true;
    }
    return false;
  }
  function renderFromSrc(el) {
    const current = el.getAttribute('src') || '';
    const mark = el.getAttribute('data-flash-processed-src') || '';
    if (mark === current && el.getAttribute('data-flash-done') === '1') return;
    el.setAttribute('data-flash-processed-src', current);
    fetchText([current]).then(src => {
      let parsed = {};
      try {
        parsed = (window.jsyaml || window.JSYAML || window.yaml || window.YAML).load(src) || {};
      } catch (e) {
        parsed = {};
      }
      if (maybeRemapByParams(el, parsed, current)) return;
      try { setBitSources(parsed && parsed.bits); } catch (e) { bitSources = []; }
      const cfg = minimalNormalize(parsed);
      applyBackground(cfg);
      applyMetadata(cfg.metadata);
      applyCustom(cfg);
      try { document.documentElement.style.scrollBehavior = 'smooth'; } catch (e) {}
      return renderSections(el, cfg).then(() => { el.setAttribute('data-flash-done', '1'); });
    }).catch(() => {
      const msg = document.createElement('div');
      msg.style.padding = '16px';
      msg.style.color = '#f66';
      msg.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu';
      msg.textContent = 'Failed to load: ' + current;
      el.innerHTML = '';
      el.appendChild(msg);
      el.setAttribute('data-flash-done', '1');
    });
  }
  function renderInline(el) {
    if (el.children.length > 0) return;
    const content = el.textContent?.trim();
    if (!content) return;
    let parsed = {};
    try {
      parsed = (window.jsyaml || window.JSYAML || window.yaml || window.YAML).load(content) || {};
    } catch (e) {
      parsed = {};
    }
    if (maybeRemapByParams(el, parsed, '')) return;
    el.textContent = '';
    try { setBitSources(parsed && parsed.bits); } catch (e) { bitSources = []; }
    const cfg = minimalNormalize(parsed);
    applyBackground(cfg);
    applyMetadata(cfg.metadata);
    applyCustom(cfg);
    try { document.documentElement.style.scrollBehavior = 'smooth'; } catch (e) {}
    return renderSections(el, cfg);
  }
  function processAll() {
    const srcEls = document.querySelectorAll('flash[src]');
    srcEls.forEach(el => renderFromSrc(el));
    const inlineEls = document.querySelectorAll('flash:not([src])');
    inlineEls.forEach(el => renderInline(el));
  }
  function startObserver() {
    const obs = new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'attributes' && m.target && m.target.tagName && m.target.tagName.toLowerCase() === 'flash' && m.attributeName === 'src') {
          m.target.removeAttribute('data-flash-done');
          renderFromSrc(m.target);
        }
        if (m.type === 'childList') {
          m.addedNodes && m.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === 'flash') {
              if (node.getAttribute('src')) renderFromSrc(node); else renderInline(node);
            }
            if (node.nodeType === 1) {
              node.querySelectorAll && node.querySelectorAll('flash').forEach(el => {
                if (el.getAttribute('src')) renderFromSrc(el); else renderInline(el);
              });
            }
          });
        }
      }
    });
    obs.observe(document.documentElement || document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
  }
  function init() {
    processAll();
    startObserver();
    try { window.switchSource = switchSourceImpl; } catch (e) {}
    window.addEventListener('popstate', processAll);
    window.addEventListener('hashchange', processAll);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
