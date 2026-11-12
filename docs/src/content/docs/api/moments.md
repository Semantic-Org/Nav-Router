---
title: Moments
lede: The methods on `Router.prototype` and `Navigator.prototype` that plugins wrap, in the order a navigation runs them.
updated: 2026-11-11
---

## How a plugin wraps a moment

A plugin takes a method from `Router.prototype` or `Navigator.prototype`, puts its own function in its place, and calls the original with `.call(this, …)`. To add a router setting, assign its default on `Router.defaults` with `??=`:

```js title="view-transitions.js"
import { Router } from 'nav-router';

Router.defaults.viewTransitions ??= {};

const proto = Router.prototype;
const { applyCascade } = proto;

proto.applyCascade = async function(matched, resolved, event = null) {
  if (!document.startViewTransition || !event || event.initial || event.hasUAVisualTransition) {
    return applyCascade.call(this, matched, resolved, event);
  }
  const transition = document.startViewTransition(() =>
    applyCascade.call(this, matched, resolved, event)
  );
  event.signal.addEventListener('abort', () => transition.skipTransition(), { once: true });
  await transition.finished;
};
```

## Course of a navigation

:::steps
1. **Intercept (`onNavigate`, `intercepted`)**: `navigator.onNavigate(event)` checks `shouldIntercept(event)` and `router.match()`, calls `router.intercepted(matched, event)`, and registers `event.intercept()`.
2. **Guards and precommit (`runGuards`, `beforeCommit`)**: After `identity` resolves, `runGuards(matched, navigation)` runs `redirect` and `permission` guards from root to leaf. On cancelable navigations, `beforeCommit(work, event, controller)` awaits the guards, follows precommit redirects, and holds the URL up to `holdCommit` for `data`.
3. **Data and views (`runData`, `resolveView`)**: `runData(matched, navigation)` resolves each route’s views via `resolveView(target)` in parallel with loading `data` and `title` down the chain.
4. **Commit and loading (`afterCommit`)**: Once the URL commits, `afterCommit(work, event, { precommitRan })` waits `loadingDelay` before showing the `loading` view through `renderPage()`, awaits the resolved result (and `loadingMin`), and hands off to `applyCascade()`.
5. **Settle and render (`applyCascade`, route callbacks, `renderPage`)**: `applyCascade(matched, resolved, event)` updates `router.page`, fires `onRouteDestroyed()`, `onRouteCreated()` and `onRouteUpdated()`, and calls `renderPage(router.page, event)`.
6. **Finish (`settled`, `failed`)**: `settled(event)` runs on `navigatesuccess`; `failed(error, event)` runs on `navigateerror` (including aborted navigations, where `error.name === 'AbortError'`).
:::

On `router.start()`, the initial URL runs from `afterCommit()` with an `{ initial: true }` event.

## `Navigator.prototype`

:::entry
### `attach()` :kind[method]

```js signature
Navigator.prototype.attach()
```

Called by `router.start()` to attach platform listeners. Call `attach.call(this)` and attach any document listeners your plugin owns (wrapped by [`preload-intent`](/plugins/preload-intent/)).
:::

:::entry
### `detach()` :kind[method]

```js signature
Navigator.prototype.detach()
```

Called by `router.stop()` (and by [`chunk-reload`](/plugins/chunk-reload/) before a full page load) to remove platform listeners. Clean up your listeners and call `detach.call(this)`.
:::

:::entry
### `onNavigate()` :kind[method]

```js signature
Navigator.prototype.onNavigate(event)
```

Called synchronously on every `window.navigation` `navigate` event — including unrouted and external links — before `shouldIntercept(event)` or `event.intercept()` runs. Call `onNavigate.call(this, event)` synchronously to let the navigation proceed, or call `event.preventDefault()` on a cancelable event to block it (wrapped by [`confirm-leave`](/plugins/confirm-leave/)).
:::

## `Router.prototype`

:::entry
### `start()` :kind[method]

```js signature
Router.prototype.start(): Promise<Router>
```

Attaches the navigator and runs the initial load. Return `start.call(this)` (wrapped by [`announcer`](/plugins/announcer/) and [`timeline`](/plugins/timeline/)).
:::

:::entry
### `stop()` :kind[method]

```js signature
Router.prototype.stop()
```

Detaches the navigator, destroys active routes from leaf to root, and resets router state. Clean up any DOM nodes or state your plugin created, then call `stop.call(this)` (wrapped by [`head`](/plugins/head/), [`announcer`](/plugins/announcer/), [`confirm-leave`](/plugins/confirm-leave/), [`chunk-reload`](/plugins/chunk-reload/) and [`timeline`](/plugins/timeline/)).
:::

:::entry
### `intercepted()` :kind[method]

```js signature
Router.prototype.intercepted(matched, event)
```

Called synchronously when the navigator takes a `navigate` event, setting `router.pending`. Return `intercepted.call(this, matched, event)` (wrapped by [`announcer`](/plugins/announcer/), [`chunk-reload`](/plugins/chunk-reload/) and [`timeline`](/plugins/timeline/)).
:::

:::entry
### `runGuards()` :kind[method]

```js signature
Router.prototype.runGuards(matched, navigation): Promise<object | null>
```

Runs `redirect` and `permission` guards from root to leaf. Resolves to `null` when allowed, `{ status: 'redirect', redirect }` on a redirect, or a `forbidden` / `notFound` / `error` result object when refused in place. Return `runGuards.call(this, matched, navigation)` (wrapped by [`confirm-leave`](/plugins/confirm-leave/) and [`timeline`](/plugins/timeline/)).
:::

:::entry
### `beforeCommit()` :kind[method]

```js signature
Router.prototype.beforeCommit(work, event, controller): Promise<void>
```

Runs inside `event.intercept({ precommitHandler })` on cancelable navigations before the URL moves. Awaits `work.guards`, follows precommit redirects via `controller.redirect()`, and waits up to `holdCommit` for `work.ready`. Return `beforeCommit.call(this, work, event, controller)`, or throw `new DOMException('…', 'AbortError')` to cancel before the URL commits (wrapped by [`confirm-leave`](/plugins/confirm-leave/)).
:::

:::entry
### `runData()` :kind[method]

```js signature
Router.prototype.runData(matched, navigation): Promise<Resolved>
```

Resolves route views in parallel with loading `data` and `title` from root to leaf, returning `{ status, view, views, activeRoutes, error? }`. Return `runData.call(this, matched, navigation)` (wrapped by [`timeline`](/plugins/timeline/)).
:::

:::entry
### `resolveView()` :kind[method]

```js signature
Router.prototype.resolveView(target): Promise<any>
```

Unwraps a single view (`layout`, `view`, `slots` entry or status view): calls a [`lazy()`](/api/lazy/) thunk, awaits a promise, and unwraps `.default`. Return `resolveView.call(this, target)` (wrapped by [`chunk-reload`](/plugins/chunk-reload/)).
:::

:::entry
### `afterCommit()` :kind[method]

```js signature
Router.prototype.afterCommit(work, event, { precommitRan }?): Promise<void>
```

Runs after the URL commits (and on `router.start()`): shows the `loading` view after `loadingDelay`, awaits `work.ready` and `loadingMin`, and calls `applyCascade()`. Return `afterCommit.call(this, work, event, { precommitRan })` (wrapped by [`confirm-leave`](/plugins/confirm-leave/)).
:::

:::entry
### `applyCascade()` :kind[method]

```js signature
Router.prototype.applyCascade(matched, resolved, event?): Promise<void>
```

Writes `router.page`, settles routes (`onRouteDestroyed`, `onRouteCreated`, `onRouteUpdated`), sets `document.title`, and calls `renderPage(router.page, event)`. Return `applyCascade.call(this, matched, resolved, event)` (wrapped by [`view-transitions`](/plugins/view-transitions/) and [`confirm-leave`](/plugins/confirm-leave/)).
:::

:::entry
### `onRouteCreated()` :kind[method]

```js signature
Router.prototype.onRouteCreated(route, context)
```

Called for each route entering `page.activeRoutes` (root to leaf) after its views mount. Calls `route.onCreated?.(context)`. Return `onRouteCreated.call(this, route, context)` (wrapped by [`head`](/plugins/head/)).
:::

:::entry
### `onRouteUpdated()` :kind[method]

```js signature
Router.prototype.onRouteUpdated(route, context)
```

Called for each active route whose entry recomputed (root to leaf). Calls `route.onUpdated?.(context)`. Return `onRouteUpdated.call(this, route, context)` (wrapped by [`head`](/plugins/head/)).
:::

:::entry
### `onRouteDestroyed()` :kind[method]

```js signature
Router.prototype.onRouteDestroyed(route, context)
```

Called for each route leaving `page.activeRoutes` (leaf to root) before its views unmount and `route.abortSignal` aborts. Calls `route.onDestroyed?.(context)`. Return `onRouteDestroyed.call(this, route, context)` (wrapped by [`head`](/plugins/head/)).
:::

:::entry
### `renderPage()` :kind[method]

```js signature
Router.prototype.renderPage(page, event?): Promise<void>
```

Puts `page.view` on screen, awaits `router.onRender?.(page, event)`, and restores inner scroll positions on a `traverse`. Called for settled pages, for the `loading` view (`page.status === 'loading'`), and for in-place updates (`event` is `null`). Return `renderPage.call(this, page, event)` (wrapped by [`head`](/plugins/head/), [`announcer`](/plugins/announcer/) and [`timeline`](/plugins/timeline/)).
:::

:::entry
### `settled()` :kind[method]

```js signature
Router.prototype.settled(event)
```

Called on `navigatesuccess` after focus reset and scroll finish, clearing `router.pending` and `router.error`. Return `settled.call(this, event)` (wrapped by [`announcer`](/plugins/announcer/), [`chunk-reload`](/plugins/chunk-reload/) and [`timeline`](/plugins/timeline/)).
:::

:::entry
### `failed()` :kind[method]

```js signature
Router.prototype.failed(error, event): Promise<void>
```

Called on `navigateerror` (or an initial load failure). Ignores `AbortError` after cleaning up any loading view; for real errors, sets `router.error`, calls `router.onError`, and renders the `error` status view if the navigation had already committed. Return `failed.call(this, error, event)` (wrapped by [`announcer`](/plugins/announcer/), [`chunk-reload`](/plugins/chunk-reload/) and [`timeline`](/plugins/timeline/)).
:::

:::entry
### `updateData()` :kind[method]

```js signature
Router.prototype.updateData(route, value): Promise<void>
```

Updates an active route’s `data` in place when a reactive dependency changes on `ReactiveRouter`, re-rendering the standing page. Return `updateData.call(this, route, value)` (wrapped by [`timeline`](/plugins/timeline/)).
:::

## Shared shapes

### `event`

| Source | Value |
|---|---|
| Browser navigation | The platform `NavigateEvent` (or `Event` in `settled()`, `ErrorEvent` in `failed()`). |
| Initial load in `start()` | `{ initial: true, navigationType, destination: { key: null }, signal }`. |
| In-place update | `null`. |

### `matched`

Returned by [`router.match()`](/api/router/#match) and passed to `intercepted()`, `runGuards()`, `runData()` and `applyCascade()`:

| Key | Type | Description |
|---|---|---|
| `route` | `Route` | Matched leaf [`Route`](/api/route/). |
| `url` | `string` | Full URL. |
| `pathname` | `string` | Pathname with `base` stripped. |
| `search` | `string` | Query string (`'?...'` or `''`). |
| `hash` | `string` | Fragment (`'#...'` or `''`). |
| `params` | `object` | Coerced path params. |
| `query` | `object` | Coerced query values. |
| `routes` | `Route[]` | Route chain from `router.root` down to `route`. |
| `redirect` | `string \| Route \| function \| null` | `route.redirect ?? null`. |

### `resolved`

Returned by `runData()` (and by `runGuards()` when a guard refuses in place) and passed to `applyCascade()`:

| Key | Type | Description |
|---|---|---|
| `status` | `'ok' \| 'forbidden' \| 'notFound' \| 'error'` | Outcome of the navigation. |
| `view` | `any` | Unwrapped leaf view, or the status view when `status` is not `'ok'`. |
| `views` | `Array<{ route, layout, view, slots }>` | Unwrapped views for the route chain. |
| `activeRoutes` | `Array<{ route, data, title }>` | Routes that settled on the page, from root down. |
| `error` | `any` | Thrown error when `status` is `'error'`. |

## Related

- [`Router`](/api/router/#routerpage): shape of `router.page`, `router.current` and `router.pending`.
- [Route options](/api/route-options/#what-your-functions-receive): shape of the lifecycle `context`.
- [`Navigator`](/api/navigator/): the `window.navigation` listener and navigation verbs.
