---
title: preload-intent
kind: plugin
lede: Warms a link’s lazy view code on hover, focus or touch, and adds `router.preload()` for warming a route by hand.
import: import '@nav-router/plugins/preload-intent'
size: preload-intent
updated: 2026-11-11
---

## Install

Import the plugin once. While the router is running, hovering, focusing or touching an `<a href>` that matches a route loads its [`lazy()`](/api/lazy/) views in the background, so the module is already in memory when the user clicks.

```js title="app.js"
import '@nav-router/plugins/preload-intent';
import { lazy, router } from 'nav-router';

const app = router({
  routes: {
    settings: {
      path: '/team/:org/settings',
      view: lazy(() => import('./settings-page.js')),
    },
  },
});
```

Preloading warms the route’s `layout`, `view` and `slots` — guards and `data` still run when the user navigates.

## `preload()`

:::entry
### `preload()` :kind[method]

```js signature
router.preload(target, args?): Promise<void>
preload(target, args?): Promise<void>
```

Warms the `layout`, `view` and `slots` of a route and its sections by hand.

**Parameters**

```params
- name: target
  type: string | Route
  required: true
  description: A route name, a `Route`, or a path such as `'/team/acme/settings'`.
- name: args
  type: object
  default: '{}'
  description: Params needed to build the route’s path when `target` is a route with `:param` segments.
```

**Returns**

```returns
type: Promise<void>
description: Resolves when every `layout`, `view` and `slots` chunk on the route chain has loaded.
```

**Example**

```js title="team-layout.js"
import { preload } from 'nav-router';

await preload('settings', { org: 'acme' });
```
:::
