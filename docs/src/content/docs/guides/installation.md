---
title: Installation
lede: This guide covers how to install `nav-router` with a package manager or load it in the browser with an import map.
updated: 2026-11-12
---

## Install packages

Install `nav-router` on its own for plain DOM apps, or alongside your UI framework's integration package:

```sh for="core" label="Vanilla JS"
npm install nav-router
```

```sh for="react" label="React"
npm install nav-router @nav-router/react
```

```sh for="solid" label="Solid"
npm install nav-router @nav-router/solid
```

:::for[core]
Plain DOM rendering (`DomView`) is built into `nav-router` — no extra adapter package is needed to render HTML strings or DOM elements.
:::

:::for[react]
`@nav-router/react` requires `react` and `react-dom` `19` or later as peer dependencies. Import `router` and `useRouter` from `@nav-router/react`; it also re-exports every helper from `nav-router`.
:::

:::for[solid]
`@nav-router/solid` requires `solid-js` `1.9` or later as a peer dependency. Import `router` from `@nav-router/solid`; it also re-exports every helper from `nav-router`.
:::

## Optional plugins

Optional integrations like `<head>` tag management and View Transitions ship in a separate package:

```sh
npm install @nav-router/plugins
```

Enable individual plugins by importing their subpath once in your entry file before `app.start()`:

```js title="app.js"
import '@nav-router/plugins/head';
import '@nav-router/plugins/view-transitions';
```

Each subpath bundles independently so unused plugins add zero bytes. See [Plugins](/plugins/) for every available plugin and its size.

## Bundlers and import maps

`nav-router` ships standard ES modules (`"type": "module"`). Bundlers such as Vite, Rollup, esbuild, and Webpack resolve bare imports and tree-shake unused helpers without extra configuration.

To run directly in the browser without a build step, map `nav-router` in a `<script type="importmap">` block before your module entry script:

```html title="index.html"
<script type="importmap">
  {
    "imports": {
      "nav-router": "https://esm.sh/nav-router"
    }
  }
</script>
<script type="module" src="./app.js"></script>
```

## Browser support

`nav-router` builds on the web platform's [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) (`window.navigation`), which is baseline across modern browsers:

- **Chrome and Edge** — 102+
- **Firefox** — 147+
- **Safari** — 26+

In older browsers without `window.navigation`, `app.start()` still matches and renders the initial URL, while `<a href>` clicks and `navigate()` fall back to standard full-page browser loads. To gate client-side navigation features explicitly, check `'navigation' in window`:

```js
if ('navigation' in window) {
  await app.start();
}
```

Next, wire up a shared layout and named routes in [Your first router](/guides/first-router/).
