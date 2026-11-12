---
title: Route
kind: class
lede: A node in the route tree — the root, a section, an index or a page. Handed to every guard, `data`, `title`, lifecycle callback and view as `route`, and kept on `router.current.route`.
import: import { Route, route } from 'nav-router'
updated: 2026-11-11
---

## Build a tree by method

Most apps declare their routes as one nested object in [`router()`](/api/router/). When a larger app splits routes across files, build the tree with `.section()`, `.index()` and `.route()` on the router or on a section:

```js for="core" label="routes.js"
import { router } from 'nav-router';

export const app = router({
  name: 'home',
  layout: RootLayout,
});

app.index({ path: '/', view: HomePage });

export const team = app.section({
  name: 'team',
  path: '/team/:org',
  layout: TeamLayout,
});

team.index({ view: MembersPage });
team.route({ name: 'member', path: '/team/:org/:userId', view: MemberPage });
team.route({
  name: 'settings',
  path: '/team/:org/settings',
  permission: ({ user }) => user?.role === 'admin',
  view: SettingsPage,
});
```

## Methods

`section()`, `route()` and `index()` are also on [`Router`](/api/router/), where they attach routes to `router.root`. Each takes an options object with any of the [Route options](/api/route-options/).

:::entry
### `section()` :kind[method]

```js signature
route.section(options?): Route
```

Adds a child section under this route and returns it so you can attach pages to it.
:::

:::entry
### `route()` :kind[method]

```js signature
route.route(options?): Route
```

Adds a child page route under this route and returns it.
:::

:::entry
### `index()` :kind[method]

```js signature
route.index(options?): Route
```

Sets the index page for this section (or root route) and returns it. Inherits its parent’s `path` and `name` when left out.
:::

::::entry
### `timeout()` :kind[method]

```js signature
route.timeout(fn, ms): number
```

Starts a `setTimeout(fn, ms)` that is cleared automatically when the route leaves the page. Also passed bound into [`onCreated`, `onUpdated` and `onDestroyed`](/api/route-options/#lifecycle-callbacks) as `timeout`.

**Parameters**

```params
- name: fn
  type: function
  required: true
  description: Function to call after `ms`.
- name: ms
  type: number
  required: true
  description: Delay in milliseconds.
```

**Returns**

```returns
type: number
description: Timer ID from `setTimeout`.
```

```js
member: {
  path: '/team/:org/:userId',
  onCreated: ({ route, timeout }) => {
    timeout(() => markVisited(route.id), 2000);
  },
  view: MemberPage,
},
```
::::

:::entry
### `interval()` :kind[method]

```js signature
route.interval(fn, ms): number
```

Starts a `setInterval(fn, ms)` that is cleared automatically when the route leaves the page. Also passed bound into [`onCreated`, `onUpdated` and `onDestroyed`](/api/route-options/#lifecycle-callbacks) as `interval`.

**Parameters**

```params
- name: fn
  type: function
  required: true
  description: Function to call every `ms`.
- name: ms
  type: number
  required: true
  description: Interval in milliseconds.
```

**Returns**

```returns
type: number
description: Timer ID from `setInterval`.
```
:::

:::entry
### `route()` factory :kind[function]

```js signature
route(options?, parent?): Route
new Route(options?, parent?, router?): Route
```

Constructs a `Route` instance.
:::

## Properties

| Property | Type | Description |
|---|---|---|
| `name` | `string \| undefined` | Route name used by `navigate()`, `href()`, `isActive()`, `isCurrent()` and `canAccess()`. |
| `path` | `string` | Full normalized path pattern (`'/team/:org'`). |
| `id` | `string` | Unique identifier (`name \|\| path`). |
| `parent` | `Route \| null` | Parent `Route`, or `null` on `router.root`. |
| `children` | `Route[]` | Direct child routes. |
| `indexRoute` | `Route \| null` | The section’s index `Route`, if it has one. |
| `ancestors` | `Route[]` | Routes from `router.root` down to this route, inclusive. |
| `router` | `Router \| null` | Owning [`Router`](/api/router/). |
| `active` | `boolean` | `true` while the route is mounted on `router.page`. |
| `abortSignal` | `AbortSignal \| undefined` | Signal for the route’s current active life, aborted when the route leaves the page. |
| `params` | `object` | `params` declaration on this route. |
| `query` | `object` | `query` declaration on this route. |
| `slots` | `object` | Named slot views declared on this route. |

Every other option declared on the route (`layout`, `view`, `redirect`, `permission`, `data`, `title`, `statusViews`, `onCreated`, `onUpdated`, `onDestroyed`, `meta`, `canLeave`) is also stored on the `Route` instance.

## Related

- [Route options](/api/route-options/): every option a route declaration accepts.
- [`Router`](/api/router/): `router.root`, `router.current.route` and `router.page.route`.
