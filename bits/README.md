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
At runtime FLASH tries to load your BIT definition from this repository:

- First tries `bits/<name>.yaml` then `bits/<name>.yml`
- Injects `CSS` once and executes `JS` with the context above

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