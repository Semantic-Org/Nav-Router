---
title: preload-intent
kind: plugin
lede: "Preloads lazy route views on pointer or keyboard link intent and adds `preload()`."
import: import '@nav-router/plugins/preload-intent'
size: preload-intent
updated: 2026-11-12
---

## Usage

Pair `@nav-router/plugins/preload-intent` with [`lazy()`](/api/lazy/) so code-split views start downloading before the user finishes clicking a link:

```js title="app.js"
import '@nav-router/plugins/preload-intent';
import { lazy, router } from 'nav-router';

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'analytics',
      path: '/teams/:org/analytics',
      view: lazy(() => import('./views/analytics.js')),
    },
  ],
});

await app.start();
```

- **Listens for `pointerover`, `focusin`, and `touchstart`** on same-origin `<a>` and `<area>` links matching a route on your router.
- **Warms view chunks only** — loads `lazy()` views, layouts, and named slots along the matched route chain. Route guards and `data` still run when the user navigates.
- **Honors Data Saver** — skips automatic preloading when `navigator.connection.saveData` is enabled.
- **Ignores non-router links** — skips external origins, `rel="external"` or `download` links, and links targeting another window or frame.

## Methods

:::entry
### `preload()` :kind[method]

```js signature
await router.preload(target, args?)
await preload(target, args?)
```

Loads any `lazy()` views or layouts on the matched route chain without navigating. Also exported directly from `nav-router` (as well as `@nav-router/react` and `@nav-router/solid`).

**Parameters**

```params
- name: target
  type: "string | Route"
  required: true
  description: Route name, `Route` instance, or path.
- name: args
  type: object
  default: "{}"
  description: Path parameters when `target` is a parameterized route.
```

**Example**

```js title="dashboard.js"
import { preload } from 'nav-router';

// Warm the editor chunk while the user reads the overview
preload('project-editor', { org: 'acme', id: 42 });
```
:::
