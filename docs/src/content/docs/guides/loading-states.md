---
title: Loading states and errors
lede: This guide covers how navigation timing prevents skeleton flicker and how routes handle loading states and errors.
updated: 2026-11-12
---

## The navigation timeline

Showing a skeleton on every click makes fast pages feel jumpy, while freezing the old URL during a slow request makes links feel unresponsive. Configure three timing thresholds on [`router()`](/api/router/#settings) to handle fast and slow loads cleanly:

```js title="app.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  holdCommit: '300ms',
  loadingDelay: '200ms',
  loadingMin: '500ms',
  statusViews: {
    loading: LoadingSkeleton,
  },
  routes,
});
```

- **Fast loads (under `holdCommit`, default `'300ms'`)** — `data` settles before the URL commits, so the address bar and new view update together in one step with no loading flash.
- **Medium loads (`300ms` to `500ms`)** — once `holdCommit` elapses, the new URL commits (`router.current` updates) and `nav-router` waits `loadingDelay` (`'200ms'`). If `data` finishes inside that window, the page swaps directly without showing a skeleton.
- **Slow loads (over `500ms`)** — after `loadingDelay`, `statusViews.loading` renders inside the active layout and stays on screen for at least `loadingMin` (`'500ms'`) so it never flickers off a few milliseconds later.

Set `holdCommit: 0` if you want the URL to commit immediately on every click. You can test all three speeds side by side in the [Loading states example](/examples/loading-states/).

## Global progress indicators

If you prefer a thin top progress bar over swapping page content, read `router.pending`. While a navigation is in flight, `router.pending` exposes `route`, `url`, `navigationType`, `committed`, and `loading`, then resets to `null` once the navigation finishes:

```js for="core" label="routes.js"
import { router } from 'nav-router';

const app = router({ mount: '#app', routes });

app.subscribe((r) => {
  document.querySelector('#progress-bar').hidden = !r.pending;
});
```

```jsx for="react" label="routes.jsx"
import { router, useRouter } from '@nav-router/react';

function ProgressBar() {
  const pending = useRouter((r) => r.pending);
  return pending ? <div className="progress-bar" /> : null;
}

const app = router({
  mount: '#app',
  layout: ({ children }) => (
    <>
      <ProgressBar />
      {children}
    </>
  ),
  routes,
});
```

```tsx for="solid" label="routes.tsx"
import { router } from '@nav-router/solid';

const app = router({
  mount: '#app',
  layout: () => (
    <>
      {app.pending && <div class="progress-bar" />}
      <slot />
    </>
  ),
  routes,
});
```

Check `pending?.loading` instead of `Boolean(pending)` if you only want the indicator to appear after `holdCommit` and `loadingDelay` have elapsed.

## Status views

Any route or `section` can define `statusViews` for `loading`, `notFound`, `forbidden`, and `error`. Child routes inherit `statusViews` down the tree, so you can register app-wide fallbacks on `router()` and override individual keys per section:

```js for="core" label="routes.js"
import { reload, router } from 'nav-router';

const app = router({
  mount: '#app',
  layout: AppLayout,
  statusViews: {
    loading: () => '<p class="skeleton">Loading…</p>',
    notFound: () => '<h1>Page not found</h1>',
    error: ({ page }) => {
      const el = document.createElement('div');
      el.innerHTML = '<h1>Something went wrong</h1><p></p><button type="button">Try again</button>';
      el.querySelector('p').textContent = page.error.message;
      el.querySelector('button').onclick = () => reload();
      return el;
    },
  },
  routes,
});
```

```jsx for="react" label="routes.jsx"
import { reload, router } from '@nav-router/react';

const app = router({
  mount: '#app',
  layout: AppLayout,
  statusViews: {
    loading: () => <p className="skeleton">Loading…</p>,
    notFound: () => <h1>Page not found</h1>,
    error: ({ page }) => (
      <div>
        <h1>Something went wrong</h1>
        <p>{page.error.message}</p>
        <button type="button" onClick={() => reload()}>Try again</button>
      </div>
    ),
  },
  routes,
});
```

```tsx for="solid" label="routes.tsx"
import { reload, router } from '@nav-router/solid';

const app = router({
  mount: '#app',
  layout: AppLayout,
  statusViews: {
    loading: () => <p class="skeleton">Loading…</p>,
    notFound: () => <h1>Page not found</h1>,
    error: (props) => (
      <div>
        <h1>Something went wrong</h1>
        <p>{props.page.error.message}</p>
        <button type="button" onClick={() => reload()}>Try again</button>
      </div>
    ),
  },
  routes,
});
```

- **`loading`** — renders while slow `data` or a [`lazy()`](/api/lazy/) view module loads. Pass `loading: null` on a child route to disable an inherited loading view.
- **`notFound`** — renders both when no route matches the URL and when a route's `data` function returns `notFound()` (see the [Not found example](/examples/not-found/)).
- **`forbidden`** — renders when a signed-in user is denied by `permission` (see [Guards and redirects](/guides/guards/)).
- **`error`** — renders when a route's `data` function or lazy import throws an uncaught error, with the thrown value on `page.error`.

## Handling uncaught errors

When `data` or a view throws an uncaught error, `nav-router` passes `(error, context)` to `onError` (defaulting to `console.error`) and records `{ error, from, url }` on `router.error`:

```js title="app.js"
const app = router({
  mount: '#app',
  onError(error, context) {
    reportError(error, {
      route: context?.route.name,
      params: context?.params,
    });
  },
  routes,
});
```

- **Parent layouts stay mounted** — when a child route's `data` throws, ancestor layouts above that route remain on screen and `statusViews.error` renders inside the parent outlet.
- **Cancelled fetches are ignored** — clicking a new link aborts the previous navigation's `signal`; `AbortError` rejections are discarded without calling `onError` or flashing an error view.
- **Recovering** — call [`reload()`](/api/router/#reload) from a retry button to run the failed route again, or navigate to any other link. Once a later navigation succeeds, `router.error` resets to `null`.
