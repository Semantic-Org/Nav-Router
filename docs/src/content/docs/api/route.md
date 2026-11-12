---
title: Route
kind: class
lede: Represents a node in your route tree and manages its active lifecycle while rendered.
import: import { route, Route } from 'nav-router'
updated: 2026-11-12
---

:::entry
### `route()` :kind[function]

```js signature
route(options?, parent?)
new Route(options?, parent?, router?)
```

Creates a `Route` node from [route options](/api/route-options/). Most apps define routes through [`router({ routes })`](/api/router/#router), [`router.route()`](/api/router/#route), or [`router.section()`](/api/router/#section), which attach each node to the router automatically.

Pass a `Route` instance anywhere a route target is accepted, including [`navigate()`](/api/router/#navigate), [`href()`](/api/router/#href), [`isActive()`](/api/is-active/), and [`canAccess()`](/api/can-access/).

**Parameters**

```params
- name: options
  type: object
  default: "{}"
  description: "[Route options](/api/route-options/) for this node."
- name: parent
  type: "Route | null"
  default: "null"
  description: Parent `Route` in the route tree.
- name: router
  type: "Router | null"
  default: "parent?.router ?? null"
  description: Owning [`Router`](/api/router/) instance (`new Route()` only).
```
:::

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string \| undefined` | Route name used by `navigate('name')` and `href('name')`. |
| `id` | `string` | Unique identifier; defaults to `name` or `path` (`${parent.id}:index` on unnamed index routes). |
| `path` | `string` | Normalized full path starting with `'/'`. Inherits `parent.path` when omitted. |
| `router` | `Router \| null` | Owning [`Router`](/api/router/) instance. |
| `parent` | `Route \| null` | Parent `Route`, or `null` on `router.root`. |
| `children` | `Route[]` | Direct child `Route` instances in registration order. |
| `indexRoute` | `Route \| null` | Child `Route` created by `index` or `route.index()`, or `null`. |
| `ancestors` | `Route[]` | Ancestor chain from `router.root` down to `this`. |
| `active` | `boolean` | `true` while this route is mounted on the rendered page. |
| `abortSignal` | `AbortSignal \| undefined` | Aborts when this route deactivates; recreated each time it activates. |
| `isLeaf` | `boolean` | `true` on matchable page routes created via `route()` or `index()`. |
| `isSection` | `boolean` | `true` on section nodes created via `section()` or nested `routes`. |
| `isIndex` | `boolean` | `true` on index routes created via `index` or `index()`. |

All [route options](/api/route-options/) passed to a route (including custom plugin fields such as `meta`) are copied directly onto the `Route` instance.

## Child routes

:::entry
### `index()` :kind[method]

```js signature
route.index(options?)
```

Defines the index leaf route for `route.path` from [route options](/api/route-options/), stores it on `route.indexRoute`, and returns the new index `Route`.
:::

:::entry
### `section()` :kind[method]

```js signature
route.section(options?)
```

Adds a child section `Route` for sharing a path prefix, layout, guard, or `data` loader across nested routes. Returns the new section `Route`.
:::

:::entry
### `route()` :kind[method]

```js signature
route.route(options?)
```

Adds a leaf child `Route` from [route options](/api/route-options/) and returns the new child `Route`. Nested `path` values must start with `route.path`:

```js
const team = app.section({ path: '/teams/:org', layout: TeamLayout });
team.index({ view: TeamOverview });

const member = team.route({
  name: 'member',
  path: '/teams/:org/members/:id',
  view: MemberProfile,
});

href(member, { org: 'acme', id: 42 });
// => '/teams/acme/members/42'
```
:::

## Timers

:::entry
### `timeout()` :kind[method]

```js signature
route.timeout(fn, ms)
```

Schedules `setTimeout(fn, ms)` and clears it automatically if the route deactivates before it fires. Returns the timer ID.
:::

:::entry
### `interval()` :kind[method]

```js signature
route.interval(fn, ms)
```

Schedules `setInterval(fn, ms)` and clears it automatically when the route deactivates. Returns the timer ID.
:::
