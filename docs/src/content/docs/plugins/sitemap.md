---
title: sitemap
kind: plugin
lede: "Adds `sitemap()` to list every route in your router tree for crawlers and static generators."
import: import '@nav-router/plugins/sitemap'
size: sitemap
updated: 2026-11-12
---

## Usage

Import `@nav-router/plugins/sitemap` before or alongside your router to call `app.sitemap()` without needing `start()` or a browser DOM:

```js title="routes.js"
import '@nav-router/plugins/sitemap';
import { router } from 'nav-router';

export const app = router({
  index: { title: 'Home', view: HomeView },
  routes: [
    { name: 'pricing', path: '/pricing', title: 'Pricing', view: PricingView },
    { name: 'post', path: '/blog/:slug', view: PostView },
    { name: 'billing', path: '/settings/billing', permission: isSignedIn, view: BillingView },
  ],
});

app.sitemap();
```

## Methods

:::entry
### `sitemap()` :kind[method]

```js signature
router.sitemap()
sitemap()
```

Walks the route tree in depth-first order and returns an entry object for each node. Also exported directly from `nav-router` (as well as `@nav-router/react` and `@nav-router/solid`) to read the active router.

**Returns**

```returns
type: "object[]"
description: One entry per route node in tree order, with `base` already prepended to each `path`.
```

Each entry contains:

```params
- name: name
  type: "string | null"
  description: Route `name`, or `null` when unnamed.
- name: path
  type: string
  description: Full path pattern with `base` prepended (such as `'/blog/:slug'`). Parameter segments stay unexpanded so your generator can fill them from data.
- name: type
  type: "'index' | 'section' | 'route'"
  description: Kind of route node in the tree.
- name: title
  type: "string | null"
  description: Static `title` string, or `null` when `title` is a function or omitted.
- name: permission
  type: boolean
  description: "`true` when the route defines a `permission` guard."
- name: redirect
  type: unknown
  description: "The route's `redirect` value, or `null` when none is set."
```
:::

## Generating `sitemap.xml`

Skip non-page or protected entries, then expand any `:param` placeholders from your data source:

```js title="scripts/build-sitemap.js"
import { app } from '../src/routes.js';

const origin = 'https://acme.example';
const postSlugs = ['winter-release', 'faster-builds'];

const paths = new Set();
for (const entry of app.sitemap()) {
  if (entry.type === 'section' || entry.permission || entry.redirect) {
    continue;
  }
  if (entry.name === 'post') {
    for (const slug of postSlugs) {
      paths.add(app.href('post', { slug }));
    }
  }
  else if (!entry.path.includes(':') && !entry.path.includes('*')) {
    paths.add(entry.path);
  }
}

const urls = [...paths].map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
```
