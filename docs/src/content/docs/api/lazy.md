---
title: lazy()
kind: function
lede: Marks a function that loads a view on first use, so its module is fetched only when a navigation or preload needs it.
import: import { lazy } from 'nav-router'
updated: 2026-11-11
---

## Signature

```js signature
lazy(load): () => Promise<any>
```

<p class="entry-label">Parameters</p>

```params
- name: load
  type: function
  required: true
  description: A function returning a view or a promise of one, such as `() => import('./settings-page.js')`. A `default` export is unwrapped automatically.
```

<p class="entry-label">Returns</p>

```returns
type: function
description: A loader function you can pass to `view`, `layout`, `slots` or `statusViews`. It runs `load()` once and reuses the result; if the import fails, the next navigation tries again.
```

## Split a view out of the bundle

A plain function on `view` is already a view, and a bare `import('./settings-page.js')` fetches as soon as routes are declared. Wrap the import in `lazy()` so the router calls it only when that route is opened or preloaded.

```js title="routes.js"
import { lazy, router } from 'nav-router';

export const app = router({
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        settings: {
          path: '/team/:org/settings',
          view: lazy(() => import('./settings-page.js')),
        },
      },
    },
  },
});
```

:::entry
### `isLazy()` :kind[function]

```js signature
isLazy(value): boolean
```

Whether `value` was created with `lazy()`.
:::

## Related

- [Route options](/api/route-options/): `view`, `layout`, `slots` and `statusViews`.
- [`preload-intent`](/plugins/preload-intent/): warms `lazy()` views on hover or focus, and adds `preload()`.
- [`chunk-reload`](/plugins/chunk-reload/): recovers when a deploy removes an old chunk.
