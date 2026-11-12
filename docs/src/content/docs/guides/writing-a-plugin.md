---
title: Writing a plugin
lede: This guide covers how to package reusable router behavior as a side-effect plugin module.
updated: 2026-11-12
---

## Side-effect modules

Every module in [`@nav-router/plugins`](/plugins/) is a plain side-effect import. Instead of registering plugins on each router instance, a plugin imports [`Router`](/api/router/) from `'nav-router'` and wraps methods on `Router.prototype`. Because `ReactRouter` and `SolidRouter` inherit from `Router`, a single plugin works across every framework integration.

Here is a minimal analytics plugin that reports settled page views:

```js title="analytics.js"
import { Router } from 'nav-router';

Router.defaults.analytics ??= {};

const proto = Router.prototype;
const { renderPage } = proto;

proto.renderPage = async function(page, event = null) {
  await renderPage.call(this, page, event);
  if (!page || page.status === 'loading') {
    return;
  }
  this.config.analytics.track?.(page.url, page.title);
};
```

Keep two rules in mind whenever you wrap a prototype method:

- **Delegate with `.call(this, ...)`** using the saved method reference so multiple plugins compose cleanly in import order.
- **Guard against loading renders** when your logic targets settled pages, since `renderPage()` also runs with `page.status === 'loading'` while `statusViews.loading` is shown.

## Router settings and route options

When an app calls `router(options)`, keys declared on `Router.defaults` become router settings on `this.config`, while all remaining keys configure the root [`Route`](/api/route/).

- **Router settings:** Declare your namespace on `Router.defaults` with `??=`. Because `this.config` merges top-level keys shallowly, merge nested defaults when reading `this.config`.
- **Custom route options:** Any custom property passed on a route definition (such as `track: false` or `meta: { ... }`) is copied directly onto its `Route` instance. Walk `page.activeRoutes` to inspect options from parent layouts down to the leaf route.

```js title="analytics.js"
const defaults = { endpoint: '/api/events' };
Router.defaults.analytics ??= {};

const getSettings = (router) => ({ ...defaults, ...router.config.analytics });

function isTrackable(page) {
  return page.activeRoutes?.every(({ route }) => route.track !== false) ?? true;
}
```

Import the plugin once at startup before creating your router:

```js for="core" label="app.js"
import './analytics.js';
import { router } from 'nav-router';

const app = router({
  analytics: { endpoint: '/collect' },
  routes: [
    { name: 'home', path: '/', view: () => '<h1>Home</h1>' },
    { name: 'preview', path: '/preview/:id', track: false, view: () => '<h1>Preview</h1>' },
  ],
});

await app.start();
```

```jsx for="react" label="app.jsx"
import './analytics.js';
import { router } from '@nav-router/react';

const app = router({
  analytics: { endpoint: '/collect' },
  routes: [
    { name: 'home', path: '/', view: () => <h1>Home</h1> },
    { name: 'preview', path: '/preview/:id', track: false, view: () => <h1>Preview</h1> },
  ],
});

await app.start();
```

```tsx for="solid" label="app.tsx"
import './analytics.js';
import { router } from '@nav-router/solid';

const app = router({
  analytics: { endpoint: '/collect' },
  routes: [
    { name: 'home', path: '/', view: () => <h1>Home</h1> },
    { name: 'preview', path: '/preview/:id', track: false, view: () => <h1>Preview</h1> },
  ],
});

await app.start();
```

## Choosing a lifecycle seam

Wrap only the prototype methods your feature needs:

- **`start()` and `stop()`** — attach or remove document-level elements and listeners alongside the router's lifetime.
- **`intercepted(matched, event)`** — run as soon as a same-origin navigation begins (paired with `settled(event)` and `failed(error, event)` in [`announcer`](/plugins/announcer/) and [`timeline`](/plugins/timeline/)).
- **`applyCascade()`** — wrap `(matched, resolved, event)` around the state commit and DOM swap, as [`view-transitions`](/plugins/view-transitions/) does with `document.startViewTransition()`.
- **`renderPage(page, event)`** — run right before or after each page or loading view renders.
- **`onRouteCreated()` and `onRouteUpdated()`** — react when individual routes activate or update in place, paired with `onRouteDestroyed()` on teardown.

You can also add new methods to `Router.prototype` (the way [`sitemap`](/plugins/sitemap/) adds `router.sitemap()`) or wrap [`Navigator`](/api/navigator/) methods like `attach()` and `detach()` when listening for DOM link intent.

## Reactive route hooks

If a custom route option accepts a function reading `params`, `query`, `data`, or `user` — like `meta` in [`head`](/plugins/head/) — evaluate it with `this.evaluateHook()` inside `onRouteCreated` and `onRouteUpdated`:

```js title="meta-plugin.js"
const proto = Router.prototype;
const { onRouteCreated, onRouteUpdated, onRouteDestroyed } = proto;

proto.evaluateMeta = function(route) {
  const value = this.evaluateHook(route, route.meta, route.viewContext(this.page), {
    kind: 'data',
    changed: (next) => Promise.resolve(next).then((resolved) => this.applyMeta(route, resolved)),
  });
  Promise.resolve(value).then((resolved) => this.applyMeta(route, resolved));
};

proto.onRouteCreated = function(route, context) {
  if (route.meta !== undefined) {
    this.evaluateMeta(route);
  }
  return onRouteCreated.call(this, route, context);
};

proto.onRouteUpdated = function(route, context) {
  if (route.meta !== undefined) {
    this.evaluateMeta(route);
  }
  return onRouteUpdated.call(this, route, context);
};

proto.onRouteDestroyed = function(route, context) {
  this.clearMeta(route);
  return onRouteDestroyed.call(this, route, context);
};
```

- **Static values** pass through `evaluateHook()` unchanged.
- **Plain `Router` instances** call the function once with the route's view context.
- **[`ReactiveRouter`](/api/reactive-router/) instances** (such as `@nav-router/solid`) track signals and `data` keys read inside the function, calling `changed(next)` whenever a dependency updates while the route remains active.

## Cleaning up per-router state

Store per-instance state in a `WeakMap` keyed by `this` (or on a namespaced router property) rather than in module-scoped variables so multiple routers in tests or embedded apps stay isolated. Always release DOM nodes and listeners inside `stop()`:

```js title="status-banner.js"
import { Router } from 'nav-router';

const banners = new WeakMap();
const proto = Router.prototype;
const { start, stop } = proto;

proto.start = function() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  banners.set(this, el);
  return start.call(this);
};

proto.stop = function() {
  banners.get(this)?.remove();
  banners.delete(this);
  return stop.call(this);
};
```
