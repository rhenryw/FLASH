<p align="center">
  <img src="https://github.com/rhenryw/FLASH/blob/359eafb5c629a86a825fed0345719dabb03450e5/img/ico.webp" width="127" alt="FLASH Logo"><br>
  <em>Fast Lightweight Automatic Site Handler</em>
</p>

<p align="center">
  <a target="_blank" href="https://discord.gg/XygZfmMM86">
    <img src="https://dcbadge.limes.pink/api/server/XygZfmMM86" alt="Join Discord!" />
  </a>
  <br><br>
  <img src="https://img.shields.io/github/stars/rhenryw/FLASH?style=social" alt="GitHub stars" />
  <img src="https://img.shields.io/github/forks/rhenryw/FLASH?style=social" alt="GitHub forks" />
  <img src="https://img.shields.io/badge/CDN-jsdelivr-blue" alt="CDN badge" />
  <a href="https://www.jsdelivr.com/package/gh/rhenryw/FLASH">
    <img src="https://data.jsdelivr.com/v1/package/gh/rhenryw/FLASH/badge" alt="jsDelivr badge" />
  </a>
</p>

# FLASH

- [FLASH](#flash)
   * [Quick start](#quick-start)
   * [To use](#to-use)
   * [Project layout](#project-layout)
   * [Define a page with YAML](#define-a-page-with-yaml)
   * [Using BITs](#using-bits)
   * [Create your own BIT](#create-your-own-bit)
   * [Add custom behavior to a BIT](#add-custom-behavior-to-a-bit)
   * [Custom HTML/CSS/JS at the site level](#custom-htmlcssjs-at-the-site-level)
   * [Using custom BIT sources](#using-custom-bit-sources)
   * [Build script](#build-script)
   * [Alternative FLASH Uses](#alternative-flash-uses)
- [More BITs info](https://github.com/rhenryw/FLASH/tree/main/bits)
- [LLM Help](https://github.com/rhenryw/FLASH/blob/main/llm.md)
  
## Quick start

```bash
npm install
npm run build
```

Open `index.html` via a static server. The page loads `dist/builtscript.js` from the CDN tag in `index.html`, which reads your `flash.yaml` at runtime and renders sections/BITs.

## To use

Paste these tags into your HTML `<head>`:

```html
<script src="https://cdn.jsdelivr.net/gh/rhenryw/cdns@main/src/index.min.js"></script>
<script cdn="rhenryw/flash/dist/index.min.js lg=0 ref=main" defer></script>
```
Put this into your HTML `<body>`:

**Option 1: External YAML file (traditional approach)**
```html
<flash src="./flash.yaml">
```
> [!NOTE]
> Add an `src` attribute with a path or link to your YAML file if it's not named `flash.yaml` at the root of your site

Then create `flash.yaml` in the same directory:

**Option 2: Inline YAML content**
```html
<flash>
background:
  color: "#0B0B0F"
metadata:
  title: "My FLASH Site"
sections:
  - type: headline
    config:
      text: "Hello FLASH"
      size: 32
  - type: paragraph
    config:
      text: "This page is powered by FLASH"
      color: "#9CA3AF"
</flash>
```

Choose the method that works best for your project structure!

**Complete example for external file approach:**

```yaml
background:
  color: "#0B0B0F"
metadata:
  title: "FLASH Site"
sections:
  - type: headline
    config:
      text: "Hello FLASH"
      size: 32
  - type: paragraph
    config:
      text: "This page is powered by FLASH"
      color: "#9CA3AF"
```

## Project layout

- `flash.yaml`: Page configuration (background, metadata, sections)
- `bits/`: Reusable BIT definitions in YAML
- `scripts/build.js`: Builds the browser runtime to `dist/index.js`
- `index.html`: Minimal host page that runs FLASH

## Define a page with YAML

```yaml
background:
  color: "#0B0B0F"
metadata:
  title: "My FLASH Site"
sections:
  - type: headline
    config:
      text: "Hello"
      size: 32
  - type: paragraph
    config:
      text: "Built with FLASH"
      color: "#9CA3AF"
```

## Using BITs

A BIT is a small, reusable component defined in `bits/<name>.yaml`. Reference BITs in `flash.yaml` via `sections` entries:

```yaml
sections:
  - type: site-header
    config:
      title: "Build sites at light speed"
  - type: blue-circle
    config:
      size: 220
      color: "#2563EB"
```

## Create your own BIT

Create `bits/my-widget.yaml`:

```yaml
Name: my-widget
CSS: |
  [data-bit="my-widget"] {
    display: block;
  }
JS: |
  const { container, config, utils } = ctx;
  const el = document.createElement('div');
  el.textContent = config.text || 'Hello from my-widget';
  el.style.color = utils.normalizeColor(config.color || '#333333');
  container.appendChild(el);
```

Use it in `flash.yaml`:

```yaml
sections:
  - type: my-widget
    config:
      text: "Custom text"
      color: "#00AAFF"
```

## Add custom behavior to a BIT

All keys under `config` are passed to your BIT’s JS as `ctx.config`. Extend your BIT by reading those values and applying them.

Example additions inside your BIT’s JS:

```js
const { container, config } = ctx;
const box = document.createElement('div');
box.textContent = config.label || 'Click me';
if (config.center) {
  box.style.display = 'flex';
  box.style.minHeight = '50vh';
  box.style.alignItems = 'center';
  box.style.justifyContent = 'center';
}
if (config.onClick === 'alert') {
  box.addEventListener('click', () => alert(config.message || 'Hi'));
}
container.appendChild(box);
```

Then in `flash.yaml`:

```yaml
sections:
  - type: my-widget
    config:
      label: "Press"
      center: true
      onClick: "alert"
      message: "Welcome!"
```

## Global API: switchSource

You can change the active page YAML at runtime.

```js
// Switch the current <flash> to a different YAML file or URL
switchSource('./pages/about.yaml')
```

Inside BIT JS, call it via `ctx.utils.switchSource`:

```js
const { container, utils } = ctx;
const btn = document.createElement('button');
btn.textContent = 'Go to About';
btn.onclick = () => utils.switchSource('./pages/about.yaml');
container.appendChild(btn);
```

## Param-based source remapping (Params)

At the top level of your page YAML, add a `Params` (or `params`) map to remap the page source based on URL query parameters. If a mapping matches, FLASH will update the `<flash src>` to that target before rendering.

```yaml
Params:
  hi:
    "1": "./pages/hi1.yaml"
    "2": "./pages/hi2.yaml"
    default: "./pages/home.yaml"
```

Examples:
- Visiting `?hi=1` loads `./pages/hi1.yaml`
- Visiting `?hi=2` loads `./pages/hi2.yaml`
- If `hi` is missing or unmapped, falls back to `default`

Works for inline `<flash>...</flash>` and external `<flash src="...">`.

## Frame section (embed URLs or YAML pages)

Use a built-in `frame` section to embed an iframe. If the `src` ends in `.yaml`/`.yml`, it embeds a nested FLASH instance pointing at that YAML; otherwise it loads the URL directly.

```yaml
sections:
  - type: frame
    config:
      src: "./pages/hi.yaml"   # or an external URL
      height: "100vh"           # number or CSS string
      sandbox: "allow-scripts allow-same-origin"
      allow: "fullscreen"
```

Notes:
- For YAML sources, the iframe includes FLASH automatically and points `flash[src]` at your YAML.
- For normal URLs, it behaves like a standard iframe.

## Custom HTML/CSS/JS at the site level

You can inject custom CSS/JS for the whole site via a `custom` block in `flash.yaml`:

```yaml
custom:
  css: |
    html, body { scroll-behavior: smooth; }
    .caps { text-transform: uppercase; }
  js: |
    console.log('FLASH site loaded');
```

To place raw HTML, render it from a BIT. Create a small `raw-html` BIT:

```yaml
Name: raw-html
CSS: |
  [data-bit="raw-html"] { display: block; }
JS: |
  const { container, config } = ctx;
  const wrapper = document.createElement('div');
  if (typeof config.html === 'string') wrapper.innerHTML = config.html;
  container.appendChild(wrapper);
```

Use it:

```yaml
sections:
  - type: raw-html
    config:
      html: "<h2 class=\"caps\">Custom Block</h2><p>Inline HTML rendered by a BIT.</p>"
```

## Using custom BIT sources

You can point FLASH to multiple BIT sources via `bits.sources` in `flash.yaml`. FLASH will try each source in order for both `.yaml` and `.yml`.

Example options:

```yaml
bits:
  sources:
    # Local directory (relative or absolute)
    - ./bits/
    - /bits/

    # GitHub repo (raw content)
    - github:
        repo: myorg/mybits
        ref: main        # optional, defaults to main
        path: bits       # optional, defaults to bits

    # Direct base URL
    - url: https://mysite.com/bits/

    # Another arbitrary base
    - https://cdn.example.com/custom-bits/
```

Resolution order for a BIT named `custom-thing`:

- Tries `BASE/custom-thing.yaml`, then `BASE/custom-thing.yml` for each BASE in `bits.sources`.
- If no `bits.sources` is provided, defaults to `./bits/` then the public repo bits.

Use it in `flash.yaml` like any other BIT:

```yaml
sections:
  - type: custom-thing
    config:
      text: "Hello from custom source"
```

## Build script

- `npm run build`

# Alternative FLASH Uses

For LLMs use [llm.md](https://github.com/rhenryw/FLASH/blob/main/llm.md) to help it understand

FLASH is a fantastic tool for LLMs, offering a swift and efficient method for them to generate user-desired content. I envision developing an AI-driven site builder utilizing FLASH in the future. Additionally, integrating WYSIWYG editors with FLASH would be beneficial, allowing for the creation and manipulation of BIT components through a user-friendly drag-and-drop interface.