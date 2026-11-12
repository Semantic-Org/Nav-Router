---
title: lazy()
kind: function
lede: Wraps a dynamic import so route views and layouts load on demand as separate chunks.
import: import { lazy, isLazy } from 'nav-router'
updated: 2026-11-12
---

:::entry
### `lazy()` :kind[function]

```js signature
lazy(load)
```

Marks a `() => import(...)` loader for code-splitting on `view`, `layout`, `slots`, or `statusViews`.

Plain functions (such as `({ data }) => '<h1>Hi</h1>'` or component functions) are already valid views, so `nav-router` never invokes a plain function just to check whether it returns a `Promise`. Wrapping a dynamic import in `lazy()` tells the router to load and unwrap the module before rendering:

- **Parallel with `data`** — Matched `lazy()` chunks download alongside route `data` instead of waiting for fetches to settle.
- **Loaded once** — Resolved modules are cached and shared with [`preload-intent`](/plugins/preload-intent/) and `preload()`. If a chunk fails to load, the cache clears so the next navigation retries (pair with [`chunk-reload`](/plugins/chunk-reload/) to handle stale deploy assets).
- **Default or named exports** — Unwraps `module.default` automatically, or uses the resolved value when you select a named export in `.then()`.

**Example**

```js title="routes.js"
import { lazy, router } from 'nav-router';

const app = router({
  mount: '#app',
  layout: lazy(() => import('./layouts/app-shell.js')),
  statusViews: {
    notFound: lazy(() => import('./views/not-found.js')),
  },
  routes: [
    // Default export (`export default function AnalyticsView() {}`)
    {
      name: 'analytics',
      path: '/analytics',
      view: lazy(() => import('./views/analytics.js')),
    },
    // Named export (`export function BillingView() {}`)
    {
      name: 'billing',
      path: '/settings/billing',
      view: lazy(() => import('./views/billing.js').then((m) => m.BillingView)),
    },
  ],
});
```
:::

:::entry
### `isLazy()` :kind[function]

```js signature
isLazy(value)
```

Returns `true` when `value` is a loader thunk created by `lazy()`.
:::
