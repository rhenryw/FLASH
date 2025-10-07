(function () {
  function fetchConfig() {
    return fetch('/config.json').then(function (r) { return r.json(); }).catch(function () { return {}; });
  }

  function applyBackground(cfg) {
    var bg = cfg.background || {};
    if (bg.color) document.body.style.backgroundColor = bg.color;
    if (bg.image) document.body.style.backgroundImage = 'url(' + bg.image + ')';
  }

  function renderSections(cfg) {
    var sections = Array.isArray(cfg.sections) ? cfg.sections : [];
    sections.forEach(function (s) {
      if (s.type === 'text') {
        var el = document.createElement('div');
        el.textContent = s.content || '';
        if (s.color) el.style.color = s.color;
        var st = s.style || {};
        if (st.bold) el.style.fontWeight = '700';
        var align = st.align || {};
        if (align.horizontal === 'center') el.style.textAlign = 'center';
        if (align.vertical === 'middle') {
          el.style.display = 'flex';
          el.style.minHeight = '100vh';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
        }
        document.body.appendChild(el);
      }
    });
  }

  function init() {
    fetchConfig().then(function (cfg) {
      applyBackground(cfg || {});
      renderSections(cfg || {});
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

