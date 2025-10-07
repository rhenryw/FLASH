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