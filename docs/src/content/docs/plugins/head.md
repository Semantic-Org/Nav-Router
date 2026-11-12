---
title: head
kind: plugin
lede: "Writes `<meta>` and canonical `<link>` tags into `document.head` from active routes and formats `document.title`."
import: import '@nav-router/plugins/head'
size: head
updated: 2026-11-12
---

## Usage

Core `nav-router` already sets `document.title` from each route's `title` option. Import `@nav-router/plugins/head` before creating your router to add `formatTitle` and per-route `meta` tags:

```js for="core" label="app.js"
import '@nav-router/plugins/head';
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  formatTitle: (title) => (title ? `${title} · Acme` : 'Acme'),
  meta: {
    description: 'Product updates and engineering notes from Acme.',
  },
  routes: [
    {
      name: 'post',
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      title: ({ data }) => data.post.title,
      meta: ({ data, page }) => ({
        description: data.post.summary,
        'og:title': data.post.title,
        'og:image': data.post.coverUrl,
        canonical: page.url,
      }),
      view: ({ data }) => `<article><h1>${data.post.title}</h1></article>`,
    },
  ],
});

await app.start();
```

```jsx for="react" label="app.jsx"
import '@nav-router/plugins/head';
import { router } from '@nav-router/react';

function Post({ data }) {
  return (
    <article>
      <h1>{data.post.title}</h1>
    </article>
  );
}

const app = router({
  mount: '#app',
  formatTitle: (title) => (title ? `${title} · Acme` : 'Acme'),
  meta: {
    description: 'Product updates and engineering notes from Acme.',
  },
  routes: [
    {
      name: 'post',
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      title: ({ data }) => data.post.title,
      meta: ({ data, page }) => ({
        description: data.post.summary,
        'og:title': data.post.title,
        'og:image': data.post.coverUrl,
        canonical: page.url,
      }),
      view: Post,
    },
  ],
});

await app.start();
```

```tsx for="solid" label="app.tsx"
import '@nav-router/plugins/head';
import { router } from '@nav-router/solid';

function Post(props) {
  return (
    <article>
      <h1>{props.data.post.title}</h1>
    </article>
  );
}

const app = router({
  mount: '#app',
  formatTitle: (title) => (title ? `${title} · Acme` : 'Acme'),
  meta: {
    description: 'Product updates and engineering notes from Acme.',
  },
  routes: [
    {
      name: 'post',
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      title: ({ data }) => data.post.title,
      meta: ({ data, page }) => ({
        description: data.post.summary,
        'og:title': data.post.title,
        'og:image': data.post.coverUrl,
        canonical: page.url,
      }),
      view: Post,
    },
  ],
});

await app.start();
```

## Route options

Add `meta` to any [route](/api/route-options/) or to the root options passed to `router()`:

```params
- name: meta
  type: "object | ((context) => object | Promise<object>)"
  description: "Tag values keyed by tag name, or a function receiving `params`, `query`, `data`, `user`, `page`, and `signal`."
```

Active routes merge their `meta` objects from the root route down to the leaf on each settled render:

- **`canonical`** writes `<link rel="canonical">` with `href`.
- **Social prefixes** (`og:`, `article:`, `profile:`, `book:`, `fb:`) write `<meta property="...">` with `content`.
- **Every other key** (such as `description`, `robots`, or `twitter:card`) writes `<meta name="...">` with `content`.
- **Child routes override parent keys.** Setting a key to `null` or `false` clears a tag inherited from a parent route.
- **Static HTML tags are preserved.** Matching tags already in `<head>` are updated in place and restored to their original value when a later route omits them or `router.stop()` runs.

:::for[solid]
In `@nav-router/solid`, `meta` functions run inside a reactive computation. Reading `data` or any Solid signal updates `<head>` in place whenever that value changes.
:::

## Settings

Pass `formatTitle` to `router(options)`:

```params
- name: formatTitle
  type: "((title, titles, page) => string | null | undefined) | null"
  default: "null"
  description: "Formats `document.title` and `router.page.title` on each settled render. `title` is the deepest active route's title (`''` if none), `titles` lists active route titles from leaf to root, and `page` is `router.page`."
```

Use `titles` when nested sections each contribute a segment to the browser tab title:

```js title="routes.js"
const app = router({
  title: 'Acme',
  formatTitle: (title, titles) => titles.join(' — '),
  routes: [
    {
      path: '/teams/:org',
      title: ({ params }) => params.org,
      routes: [
        { name: 'billing', path: '/teams/:org/billing', title: 'Billing', view: BillingView },
      ],
    },
  ],
});
// Visiting /teams/design/billing sets document.title to "Billing — design — Acme"
```
