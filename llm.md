LLM confused on FLASH? Drag this file into them to get them in the know.


# LLM Sys instructions START

Prefer custom BITS over raw HTML or calling bits, use only FLASH and not anything else, follow these and the user's instructions. Create a react like website. If there should be multiple pages create a pages folder and then change the YAML source using javascript depending on URL params

# LLM Sys instructions START END

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
- [More BITs info](https://github.com/rhenryw/FLASH/tree/main/bits)
  
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


# BIT Authoring Guide

## What is a BIT
A BIT is a small, reusable embed that FLASH can load dynamically from this repository at runtime.

- **Definition file**: `bits/<name>.yaml`
- **Required keys**: `Name`, `CSS`, `JS`
- **Config**: Users pass arbitrary options from their `flash.yaml`; your BIT reads them via `ctx.config`.

## BIT file structure
Create a file `bits/<name>.yaml` containing:

```
Name: <name>
CSS: |
  [data-bit="<name>"] {
    display: block;
  }
JS: |
  const { container, config, metadata, utils } = ctx;
  const el = document.createElement('div');
  el.textContent = config.text || 'Hello';
  el.style.color = utils.normalizeColor(config.color || '#333333');
  container.appendChild(el);
```

- **Name**: The canonical name used by users in `flash.yaml`.
- **CSS**: CSS injected once per page for your BIT. Target your container via `[data-bit="<name>"]` or child selectors.
- **JS**: Runs when your BIT is rendered. Use the context:
  - `ctx.container`: A `div` appended to `body` for your BIT
  - `ctx.config`: User-supplied options from `flash.yaml`
  - `ctx.metadata`: Page-level metadata from `flash.yaml`
  - `ctx.utils.normalizeColor(value)`: Normalizes common color inputs

## Reading user options
Users can provide any options. Common examples are `color`, `text`, `placement`, `align`, `size`, etc. Read them from `ctx.config` and implement behavior in your JS.

## Using a BIT in flash.yaml
You can reference a BIT in multiple ways:

Inline under `section:` using the BIT name:

```
section:
  pretty-text:
    text: "Hello world"
    color: "#00AAFF"
```

As an array item with `type`:

```
sections:
  - type: pretty-text
    config:
      text: "Hello world"
      color: "#00AAFF"
```

As a single-key object item:

```
sections:
  - pretty-text:
      text: "Hello world"
      color: "#00AAFF"
```

## Page metadata in flash.yaml
Add optional metadata to control document title and common meta tags.

```
metadata:
  title: "My Page"
  description: "Landing page built with FLASH"
  author: "You"
  image: "https://example.com/og.png"
```

## How loading works
At runtime FLASH can load your BIT definition from multiple sources.

Order for a BIT named `<name>`:

- For each source base in `bits.sources`, try `BASE/<name>.yaml` then `BASE/<name>.yml`.
- If `bits.sources` is not specified, FLASH tries `./bits/` first, then the public repo.

Configure sources in `flash.yaml`:

```yaml
bits:
  sources:
    - ./bits/
    - github:
        repo: you/your-bits
        ref: main
        path: bits
    - url: https://mysite.com/bits/
```

You can also use a plain string base URL:

```yaml
bits:
  sources:
    - https://cdn.example.com/my-bits/
```

FLASH injects `CSS` once and executes `JS` with the provided context.

## Contributing a BIT
- Fork the repo
- Add `bits/<name>.yaml`
- Test locally by referencing your BIT name in `flash.yaml`
- Open a PR

## Example: pretty-text.yaml
```
Name: pretty-text
CSS: |
  [data-bit="pretty-text"] {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu;
  }
JS: |
  const { container, config, utils } = ctx;
  const el = document.createElement('div');
  el.textContent = config.text || 'Pretty';
  el.style.color = utils.normalizeColor(config.color || '#FF00AA');
  el.style.fontSize = (config.size || 32) + 'px';
  if (config.placement === 'center') {
    el.style.display = 'flex';
    el.style.minHeight = '100vh';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.textAlign = 'center';
  }
  container.appendChild(el);
```

## Extending BITs with config

Your BIT receives `ctx.config`. Prefer small, composable options and sensible defaults.

Example patterns:

```yaml
sections:
  - type: pretty-text
    config:
      text: "Hello"
      color: "#FF00AA"
      size: 32
      center: true
      onClick: "alert"
      message: "Welcome"
```

Corresponding JS inside the BIT:

```js
const { container, config, utils } = ctx;
const el = document.createElement('div');
if (config.center) {
  el.style.display = 'flex';
  el.style.minHeight = '60vh';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
}
el.textContent = config.text || 'Pretty';
el.style.color = utils.normalizeColor(config.color || '#FF00AA');
el.style.fontSize = (config.size || 28) + 'px';
if (config.onClick === 'alert') {
  el.addEventListener('click', () => alert(config.message || 'Hi'));
}
container.appendChild(el);
```

## Configuration conventions

- Plain properties for values: `text`, `color`, `size`
- Boolean flags for behavior: `center`, `sticky`, `glow`
- Nested objects for grouped styles: `background`, `style`, `align`
- Optional `id` for anchors: `config.id` becomes the container `id`

```yaml
sections:
  - type: site-header
    config:
      id: home
      title: "Build fast"
      background:
        color: "#111827"
      textColor: "#E5E7EB"
```

## Site-level custom CSS/JS

You can offer escape hatches at the page level via `flash.yaml` `custom` block. FLASH will inject these globally:

```yaml
custom:
  css: |
    :root { --accent: #7AA2F7; }
    [data-bit="cta-button"] button { border-radius: 9999px; }
  js: |
    console.log('Custom site script loaded');
```

## Rendering raw HTML

Implement a `raw-html` BIT to safely place custom HTML in sections:

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

Usage:

```yaml
sections:
  - type: raw-html
    config:
      html: "<h2>Custom Block</h2><p>Inline HTML</p>"
```

## Debugging tips

- Verify your BIT name matches the YAML file and `Name` key
- Scope CSS to `[data-bit="<name>"]` to avoid bleeding styles
- Log `ctx` in your BIT JS to inspect `config` and `metadata`
- If CSS doesn’t apply, ensure the style tag is injected once and selectors match