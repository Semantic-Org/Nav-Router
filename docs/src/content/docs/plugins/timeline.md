---
title: timeline
kind: plugin
lede: "Records navigation, guard, data, and render spans in the browser DevTools Performance panel."
import: import '@nav-router/plugins/timeline'
size: timeline
updated: 2026-11-12
---

## Usage

Import `@nav-router/plugins/timeline` before creating your router, then record a profile in your browser's DevTools **Performance** panel while navigating through your app:

```js title="app.js"
import '@nav-router/plugins/timeline';
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  // ...routes
});

await app.start();
```

To omit the plugin from production bundles altogether, dynamically import it before calling `router()`:

```js title="app.js"
import { router } from 'nav-router';

if (import.meta.env.DEV) {
  await import('@nav-router/plugins/timeline');
}

const app = router({ mount: '#app', /* ...routes */ });
await app.start();
```

## Tracks and spans

Traces appear under a dedicated DevTools track group (`router` by default) with two tracks:

- **`navigation` track** — marks each intercepted navigation (`router:intercepted`) and measures `router:start` and `router:navigate <route>` through completion.
- **`cascade` track** — breaks each navigation down by phase:
  - **`router:guards`** — `redirect` and `permission` checks along with their outcome
  - **`router:data`** — route `data` functions and lazy view loading
  - **`router:render`** — DOM or component rendering
  - **`router:recompute`** — in-place reactive `data` updates

## Settings

Pass `timelineGroup` to `router(options)`:

```params
- name: timelineGroup
  type: string
  default: "'router'"
  description: Track group label in the DevTools Performance panel. Give each router a distinct name when running more than one on the same page.
```
