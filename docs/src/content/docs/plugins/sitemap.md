---
title: sitemap
kind: plugin
lede: Lists every route as a page a crawler or generator can read, and adds `router.sitemap()`.
import: import '@nav-router/plugins/sitemap'
size: sitemap
updated: 2026-11-11
---

## Install

Import the plugin once. `router.sitemap()` runs in Node or the browser without calling `router.start()`.

```js title="generate-sitemap.js"
import '@nav-router/plugins/sitemap';
import { app } from './routes.js';

const entries = app.sitemap();
```

## `sitemap()`

:::entry
### `sitemap()` :kind[method]

```js signature
router.sitemap(): Array<SitemapEntry>
sitemap(): Array<SitemapEntry>
```

Walks the route tree from the root down and returns one object per route in declaration order.

**Returns**

```returns
type: 'Array<{ name, path, type, title, permission, redirect }>'
description: Every route in the tree, with the router’s `base` prepended to `path`.
```

```js title="generate-sitemap.js"
import '@nav-router/plugins/sitemap';
import { app } from './routes.js';

console.log(app.sitemap());
// [
//   { name: 'home', path: '/', type: 'index', title: 'Overview', permission: false, redirect: null },
//   { name: 'team', path: '/team/:org', type: 'section', title: null, permission: false, redirect: null },
//   { name: 'members', path: '/team/:org/members', type: 'index', title: 'Members', permission: false, redirect: null },
//   { name: 'member', path: '/team/:org/:userId', type: 'route', title: null, permission: false, redirect: null },
//   { name: 'settings', path: '/team/:org/settings', type: 'route', title: 'Settings', permission: true, redirect: null }
// ]
```
:::

## Entry shape

| Key | Type | Description |
|---|---|---|
| `name` | `string \| null` | Route name, or `null` when unnamed. |
| `path` | `string` | Route path with `base` prepended (`'/team/:org/members'`). |
| `type` | `'route' \| 'section' \| 'index'` | Whether the node is a section, an index route or a leaf route. |
| `title` | `string \| null` | Static `title` string, or `null` when omitted or declared as a function. |
| `permission` | `boolean` | Whether this route declares its own `permission` guard. |
| `redirect` | `string \| Route \| function \| null` | The route’s `redirect` target, or `null`. |
