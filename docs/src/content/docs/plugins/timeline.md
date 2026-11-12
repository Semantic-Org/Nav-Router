---
title: timeline
kind: plugin
lede: Draws each navigation and its steps in the browser’s DevTools Performance panel.
import: import '@nav-router/plugins/timeline'
size: timeline
updated: 2026-11-11
---

## Install

Import the plugin once. Record a profile in the DevTools Performance panel to see two custom tracks — `navigation` and `cascade` — under the router’s track group.

```js title="app.js"
import '@nav-router/plugins/timeline';
import { router } from 'nav-router';

const app = router({
  timelineGroup: 'router',
  // the routes
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `timelineGroup` | `string` | `'router'` | Name of the track group in the DevTools Performance panel. |

## Tracks

| Track | Entry | Measures |
|---|---|---|
| `navigation` | `router:start` | Initial page load in `router.start()`. |
| `navigation` | `router:intercepted` | Mark at the start of an intercepted navigation. |
| `navigation` | `router:navigate <route>` | Full navigation from intercept until it settles, fails or is aborted. |
| `cascade` | `router:guards` | `redirect` and `permission` guards. |
| `cascade` | `router:data` | Route `data` and `lazy()` views. |
| `cascade` | `router:render` | Rendering the page or status view. |
| `cascade` | `router:recompute` | An active route’s `data` recomputing in place. |
