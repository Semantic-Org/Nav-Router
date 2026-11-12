---
title: Views and slots
lede: This guide covers how Vanilla JS routes render HTML or DOM nodes into `<slot>` layouts and manage route lifecycles.
updated: 2026-11-12
---

## Returning HTML or DOM nodes

Plain DOM rendering is built into `nav-router`. On any `view`, `layout`, `slots` entry, or `statusViews` handler, pass a function (or static value) returning whichever format fits your page:

- **HTML string** — parsed via `<template>`, supporting a single root element or sibling elements
- **`Element` or `Node`** — built with `document.createElement()` when wiring properties or event handlers directly
- **`DocumentFragment`** (or an array of `Node` instances) — inserted in order without adding a wrapper element

```js title="routes.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'post',
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      view({ data }) {
        const article = document.createElement('article');
        const heading = document.createElement('h1');
        heading.textContent = data.post.title;
        article.append(heading);
        return article;
      },
    },
  ],
});

await app.start();
```

Escape untrusted user input before interpolating it into HTML strings, or assign `textContent` on created elements as shown above.

When an active route re-renders on a param or query change, any focused control inside the view with an `id` attribute keeps its focus and text selection in the updated DOM.

## View context

Every view, layout, slot, and status view function receives one context object:

- **`params` and `query`** — coerced path parameters and query values for the active URL
- **`data`** — merged data from ancestor routes down to the route owning this view
- **`user`** — the current user from `identity` or `router.user`
- **`page`** — the rendered page object (`page.url`, `page.status`, `page.title`, and `page.error`)
- **`route` and `router`** — the owning [`Route`](/api/route/) and [`Router`](/api/router/) instances
- **`signal`** — `AbortSignal` (`route.abortSignal`) that aborts when the route leaves the page

Status views read `page.url` or `page.error` from `page`:

```js title="routes.js"
statusViews: {
  notFound: ({ page }) => `<p>Nothing found at <code>${page.url}</code>.</p>`,
  error: ({ page }) => `<p>Could not load page: ${page.error.message}</p>`,
}
```

## Layouts and `<slot>` outlets

Layouts place child views using native `<slot>` elements:

- **`<slot></slot>`** renders the active child layout or leaf `view`.
- **`<slot name="inspector"></slot>`** renders a matching `slots.inspector` view declared on the route or any active child route beneath it.

Children placed inside a `<slot>` act as fallback content. They stay visible when no active route fills that slot, and return automatically when leaving a child route that filled it (or when a deeper route clears a parent slot with `slots: { inspector: null }`):

```js title="routes.js"
app.section({
  path: '/projects/:id',
  layout: () => `
    <div class="workspace">
      <main><slot></slot></main>
      <aside>
        <slot name="inspector"><p>Select an issue to inspect.</p></slot>
      </aside>
    </div>
  `,
  routes: [
    {
      name: 'issues',
      path: '/projects/:id/issues',
      view: () => '<h1>Issues</h1>',
    },
    {
      name: 'issue',
      path: '/projects/:id/issues/:issueId',
      view: ({ params }) => `<h1>Issue #${params.issueId}</h1>`,
      slots: {
        inspector: ({ params }) => `<p>Details for #${params.issueId}</p>`,
      },
    },
  ],
});
```

Navigating from `/projects/acme/issues` to `/projects/acme/issues/42` keeps `.workspace` mounted while swapping `<main>` and `<aside>`.

## Route lifecycles and cleanup

Use `onCreated`, `onUpdated`, and `onDestroyed` on a route to manage imperative DOM listeners or third-party widgets. Each callback receives `params`, `query`, `data`, `previous`, `route`, `router`, `abortSignal`, `timeout`, and `interval`:

- **`abortSignal`** aborts when the route deactivates — pass `{ signal: abortSignal }` to `addEventListener()` for automatic listener cleanup.
- **`timeout(fn, ms)` and `interval(fn, ms)`** schedule timers (also available on `route.timeout()` and `route.interval()`) that clear automatically on deactivation.
- **`onDestroyed`** runs right before the route's DOM nodes are removed so widgets can measure or clean up live elements.

```js title="routes.js"
{
  name: 'board',
  path: '/projects/:id/board',
  view: () => '<div class="board">...</div>',
  onCreated({ abortSignal, interval, router }) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'r') {
        router.reload();
      }
    }, { signal: abortSignal });

    interval(() => router.reload(), 30_000);
  },
}
```

:::note
`onUpdated` replaces a Vanilla JS view's DOM nodes without aborting `abortSignal`. Wire element-level listeners inside `view()` via `document.createElement()`, or delegate on `document` once in `onCreated` with `{ signal: abortSignal }`.
:::
