---
title: Introduction
lede: This guide introduces `nav-router` and explains how it builds client-side routing on the browser's Navigation API.
updated: 2026-11-12
---

## One route tree

`nav-router` is a small client-side router built directly on the browser's [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API). You declare URL patterns, access checks, async data loaders, and views together in one route tree:

```js for="core" label="app.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  layout: () => `
    <nav><a href="/">Home</a> <a href="/blog/hello">Blog</a></nav>
    <main><slot></slot></main>
  `,
  index: {
    view: () => '<h1>Home</h1>',
  },
  routes: {
    post: {
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      view: ({ data }) => `<article><h1>${data.post.title}</h1></article>`,
    },
  },
});

await app.start();
```

```jsx for="react" label="app.jsx"
import { router } from '@nav-router/react';

function AppLayout({ children }) {
  return (
    <>
      <nav><a href="/">Home</a> <a href="/blog/hello">Blog</a></nav>
      <main>{children}</main>
    </>
  );
}

const app = router({
  mount: '#app',
  layout: AppLayout,
  index: {
    view: () => <h1>Home</h1>,
  },
  routes: {
    post: {
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      view: ({ data }) => <article><h1>{data.post.title}</h1></article>,
    },
  },
});

await app.start();
```

```tsx for="solid" label="app.tsx"
import { router } from '@nav-router/solid';

function AppLayout() {
  return (
    <>
      <nav><a href="/">Home</a> <a href="/blog/hello">Blog</a></nav>
      <main><slot /></main>
    </>
  );
}

const app = router({
  mount: '#app',
  layout: AppLayout,
  index: {
    view: () => <h1>Home</h1>,
  },
  routes: {
    post: {
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      view: (props) => <article><h1>{props.data.post.title}</h1></article>,
    },
  },
});

await app.start();
```

## Why the Navigation API

Older client-side routers patched `history.pushState()` and relied on custom `<Link>` components to intercept clicks. Building directly on `window.navigation` lets the browser coordinate every transition natively:

- **Plain HTML links and forms** — standard `<a href>` clicks and GET `<form>` submissions fire a single `navigate` event. You write normal HTML without `<Link>` wrappers, while external links and file downloads pass straight to the browser.
- **Automatic cancellation** — every navigation provides an `AbortSignal` passed to your `data` and guard functions as `signal`. Clicking another link mid-fetch aborts the stale `fetch()` call immediately.
- **History-entry state** — each session history entry owns its own key and structured state. Pressing Back or Forward restores previously loaded route data and scroll position from that visit instead of fetching again.
- **Pre-commit guards** — redirects and `permission` checks run before the URL commits, keeping unauthorized pages out of browser history.

## Views and frameworks

Plain DOM rendering (`DomView`) is built into `nav-router` core, so functions returning HTML strings or DOM nodes render with zero extra packages.

When building with a UI framework, swap your `router` import for an integration package while keeping the same route configuration:

- **`nav-router`** — HTML strings, DOM elements, `DocumentFragment` nodes, and Web Components
- **`@nav-router/react`** — React components with `children` and named slot props, plus `useRouter()`
- **`@nav-router/solid`** — Solid components driven by fine-grained reactive route props

## Opt-in plugins

Core focuses on matching URLs, running guards, loading `data`, and mounting views. Optional browser integrations ship in [`@nav-router/plugins`](/plugins/) and install by importing the subpath you want:

```js title="app.js"
import '@nav-router/plugins/head';
import '@nav-router/plugins/view-transitions';
import { router } from 'nav-router';
```

Available plugins add `<head>` management (`head`), View Transitions (`view-transitions`), screen-reader route announcements (`announcer`), unsaved-form prompts (`confirm-leave`), hover preloading (`preload-intent`), stale-chunk recovery (`chunk-reload`), DevTools performance tracks (`timeline`), and sitemaps (`sitemap`). Unused plugins stay out of your bundle.

Continue to [Installation](/guides/installation/) to add `nav-router` to a project, or jump straight to [Your first router](/guides/first-router/).
