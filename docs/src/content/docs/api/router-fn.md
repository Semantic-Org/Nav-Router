---
title: router()
kind: function
lede: Creates a `Router` from one options object. Also exported as `site()`.
import: import { router } from 'nav-router'
updated: 2026-11-11
---

## Signature

```js signature
router(options?): Router
site(options?): Router
```

<p class="entry-label">Parameters</p>

```params
- name: options
  type: object
  default: '{}'
  description: '[Router settings](/api/router/#settings) and the root route’s [options](/api/route-options/) in one object.'
```

<p class="entry-label">Returns</p>

```returns
type: Router
description: A new [`Router`](/api/router/). Call `app.start()` to begin listening for navigations.
```

```js for="core" label="app.js"
import { router } from 'nav-router';

export const app = router({
  holdCommit: '300ms',
  layout: RootLayout,
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        members: { path: '/team/:org/members', view: MembersPage },
      },
    },
  },
});

await app.start();
```

## How exported functions find the router

Functions like [`navigate()`](/api/router/#navigate), [`href()`](/api/router/#href) and [`isActive()`](/api/is-active/) act on the active router without you passing it in.

`app.start()` sets the active router and exposes it as `window.router` for the console (set `attachGlobal` on [`Router`](/api/router/#settings) to rename it, or `null` to skip). `app.stop()` clears both.

:::entry
### `getRouter()` :kind[function]

```js signature
getRouter(): Router | undefined
```

Returns the active [`Router`](/api/router/), falling back to `window.router`.
:::

:::entry
### `setRouter()` :kind[function]

```js signature
setRouter(instance)
```

Sets the active [`Router`](/api/router/) by hand. Reach for it when you call `href()`, `match()` or `canAccess()` without `start()` — in a server render or a test — or when switching between two routers.

**Parameters**

```params
- name: instance
  type: Router | null
  required: true
  description: The router to make active, or `null` to clear it.
```

```js title="server.js"
import { href, router, setRouter } from 'nav-router';
import { routes } from './routes.js';

const app = router(routes);
setRouter(app);

const url = href('members', { org: 'acme' });
```
:::

## Two routers on one page

Give each router its own `base`, `mount` and `attachGlobal`:

```js for="core" label="app.js"
const teamApp = router({
  base: '/team',
  mount: '#team',
  attachGlobal: 'teamRouter',
  routes: {
    members: { path: '/:org/members', view: MembersPage },
  },
});

const docsApp = router({
  base: '/docs',
  mount: '#docs',
  attachGlobal: 'docsRouter',
  index: { path: '/', view: DocsHome },
});
```

Only one router is active at a time. When two share a page, call `teamApp.navigate()` and `teamApp.href()` on the instance rather than the exported functions.

## Related

- [`Router`](/api/router/): settings, methods and properties on the router instance.
- [Route options](/api/route-options/): options for the root route and its children.
