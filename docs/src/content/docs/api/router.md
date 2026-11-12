---
title: Router
kind: class
lede: Holds the route tree, runs each navigation from the `navigate` event to the rendered page, and keeps the current page. An app has one.
import: import { Router } from 'nav-router'
size: core
updated: 2026-11-11
---

## Create a router

Pass one options object. Keys the router declares are its settings; every other key belongs to the root [route](/api/route-options/), so a small app reads as a single tree.

```js for="core" label="routes.js"
import { router } from 'nav-router';

export const app = router({
  // settings
  holdCommit: '300ms',
  signInRoute: 'signIn',
  // the root route
  layout: RootLayout,
  index: { path: '/', view: HomePage },
});
```

## Settings

Every setting and its default. The resolved values are on `router.config`.

| Setting | Type | Default | Description |
|---|---|---|---|
| `mount` | `string \| Element` | `'body'` | Selector or element the app renders into. |
| `base` | `string` | `''` | Path prefix the app is served under. |
| `holdCommit` | `duration` | `'300ms'` | How long the URL waits for `data` before committing. A fast load settles before the URL moves. |
| `loadingDelay` | `duration` | `'200ms'` | Time after commit before the loading view shows. |
| `loadingMin` | `duration` | `'500ms'` | Once shown, how long the loading view stays, so it never flickers. |
| `signInRoute` | `string \| Route` | `null` | Where a refused `permission` guard sends a signed-out user, with `returnTo` in the query. |
| `identity` | `value \| function` | `null` | The user guards read: a value, or a function of the navigation returning one or a promise of one. |
| `user` | `any` | `null` | Initial value of `router.user` when `identity` is not used. |
| `restoreScroll` | `string \| string[]` | `null` | Selector of an inner scroller whose position is restored on back and forward. |
| `attachGlobal` | `string \| null` | `'router'` | Name the router is exposed under on `window`, for the console. |
| `onChange` | `function` | `null` | Called when the page or pending state changes. |
| `onRender` | `function` | `null` | Called after each render. |
| `onError` | `function` | `console.error` | Called with `(error, context)` when a navigation, `data` function or view throws. |
| `dataChanged` | `function` | `!isEqual(next, prev)` | Compares previous and next values when checking whether `data` or `user` changed. |

Plugins add their own settings when imported: `formatTitle` ([`head`](/plugins/head/)), `viewTransitions` ([`view-transitions`](/plugins/view-transitions/)), `announcer` ([`announcer`](/plugins/announcer/)), `confirm` ([`confirm-leave`](/plugins/confirm-leave/)), `chunkReload` ([`chunk-reload`](/plugins/chunk-reload/)) and `timelineGroup` ([`timeline`](/plugins/timeline/)).

:::tip[See the timing settings run]
The trace on the [homepage](/) plays one navigation against `holdCommit`, `loadingDelay` and `loadingMin`.
:::

## Methods

Each method is also exported as a function that acts on the page’s router, so a view can call `navigate()` without holding it.

:::entry
### `start()` :kind[method]

```js signature
router.start(): Promise<Router>
```

Starts listening on `window.navigation` and runs the initial navigation for the current URL.

**Returns**

```returns
type: Promise<Router>
description: Resolves to the router once the first page has settled.
```

```js for="core" label="app.js"
import { router } from 'nav-router';
import { routes } from './routes.js';

export const app = await router(routes).start();
```
:::

:::entry
### `stop()` :kind[method]

```js signature
router.stop()
```

Stops listening on `window.navigation` and tears down the active routes on the page.
:::

::::entry
### `navigate()` :kind[method]

```js signature
router.navigate(target, args?, options?): { committed, finished }
navigate(target, args?, options?): { committed, finished }
```

Goes to a route by name, a `Route`, or a literal path. `args` is one flat object: keys the route declares as params fill the path, every other key becomes the query.

**Parameters**

```params
- name: target
  type: string | Route
  required: true
  description: A route name, a `Route`, or a path such as `'/team/acme'`.
- name: args
  type: object
  default: '{}'
  description: Params and query in one object.
- name: options
  type: object
  default: '{}'
  description: How the entry is written and what the page does after.
  options:
    - name: history
      type: "'auto' | 'push' | 'replace'"
      default: "'auto'"
      description: Push a new entry, or replace the current one. `'auto'` replaces when the URL is unchanged.
    - name: state
      type: any
      description: Stored on the history entry.
    - name: info
      type: any
      description: Passed to this navigation only.
    - name: resetScroll
      type: boolean
      default: 'true'
      description: Scroll to the top after render.
    - name: resetFocus
      type: boolean
      default: 'true'
      description: Move focus to the page after render.
    - name: hash
      type: string
      description: Fragment to append.
    - name: keepQuery
      type: boolean
      default: 'false'
      description: Carry the current query into the new URL.
    - name: absolute
      type: boolean
      default: 'false'
      description: Build the URL with its origin.
```

**Returns**

```returns
type: '{ committed: Promise, finished: Promise }'
description: The Navigation API’s two promises, `committed` when the URL changes and `finished` when the page has rendered.
```

**Example**

```js title="members.js"
import { navigate } from 'nav-router';

// params fill the path, the rest is query
await navigate('member', {
  org: 'acme',
  userId: 'ada',
  section: 'commits',
}).finished;
// /team/acme/ada?section=commits
```

:::warning[Without the Navigation API, this is a page load]
In a browser without `window.navigation`, `navigate()` falls back to `location.assign()` and the page reloads.
:::
::::

:::entry
### `replace()` :kind[function]

```js signature
replace(target, args?, options?): { committed, finished }
```

Calls `navigate()` with `history: 'replace'`, replacing the current history entry instead of pushing a new one. Exported as a function only.
:::

:::entry
### `href()` :kind[method]

```js signature
router.href(target, args?, options?): string
href(target, args?, options?): string
```

Builds the URL `navigate()` would go to, without going. Use it for `<a href>`, so links stay plain anchors. Also exported as `url()` and `urlFor()`.

**Parameters**

```params
- name: target
  type: string | Route
  required: true
  description: As in `navigate()`.
- name: args
  type: object
  default: '{}'
  description: As in `navigate()`.
- name: options
  type: '{ hash, absolute, keepQuery }'
  default: '{}'
  description: The URL options of `navigate()`.
```

**Returns**

```returns
type: string
description: The URL, with the router’s `base` applied. A path outside the app is returned unchanged.
```
:::

:::entry
### `match()` :kind[method]

```js signature
router.match(url): Match | null
match(url): Match | null
```

Matches a path or URL against the route tree without navigating, and returns the winning route with its coerced `params` and `query`.

**Parameters**

```params
- name: url
  type: string | URL
  required: true
  description: A path or URL to test.
```

**Returns**

```returns
type: Match | null
description: '`{ route, url, pathname, search, hash, params, query, routes, redirect }`, or `null` when no route matches.'
```

```js
const matched = app.match('/team/acme/ada?section=commits');
// matched.route.name → 'member'
// matched.params     → { org: 'acme', userId: 'ada' }
// matched.query      → { section: 'commits' }
```
:::

:::entry
### `back()` :kind[method]

```js signature
router.back(fallback?, args?): { committed, finished }
back(fallback?, args?): { committed, finished }
```

Goes back one entry. When there is no earlier entry in this app, such as a page opened from a shared link, it navigates to `fallback` instead.

**Parameters**

```params
- name: fallback
  type: string | Route
  description: Where to go when there is nothing to go back to. The root route when left out.
- name: args
  type: object
  default: '{}'
  description: Params and query for `fallback`.
```
:::

:::entry
### `forward()` :kind[method]

```js signature
router.forward(): { committed, finished }
forward(): { committed, finished }
```

Goes forward one entry when `router.canGoForward` is `true`.
:::

:::entry
### `traverseTo()` :kind[method]

```js signature
router.traverseTo(key, options?): { committed, finished }
traverseTo(key, options?): { committed, finished }
```

Jumps to a history entry by its `key` (from `router.entries` or `router.current.key`).

**Parameters**

```params
- name: key
  type: string
  required: true
  description: The history entry `key` to jump to.
- name: options
  type: '{ info }'
  default: '{}'
  description: Passed to this navigation only.
```
:::

:::entry
### `reload()` :kind[method]

```js signature
router.reload(options?): { committed, finished }
reload(options?): { committed, finished }
```

Re-runs the current page’s `identity`, guards and `data` in place without resetting scroll or focus.

**Parameters**

```params
- name: options
  type: '{ state, info }'
  default: '{}'
  description: Entry `state` and navigation `info`.
```
:::

:::entry
### `subscribe()` :kind[method]

```js signature
router.subscribe(listener): function
```

Calls `listener(router)` whenever the router’s state changes, and returns an unsubscribe function.
:::

## Properties

| Property | Type | Description |
|---|---|---|
| `current` | `Match \| null` | The committed match: route, params, query, chain and history entry. |
| `page` | `Page \| null` | What is on screen, including its `status`, merged `data` and `titles`. |
| `pending` | `Pending \| null` | The navigation in flight, with `committed` and `loading` flags. |
| `error` | `{ error, from, url } \| null` | The last navigation error. |
| `user` | `any` | The user read by guards, `data`, `title` and views. |
| `canGoBack` | `boolean` | Whether there is an earlier entry in this app. |
| `canGoForward` | `boolean` | Whether there is a later entry. |
| `entry` | `NavigationHistoryEntry \| null` | The browser’s current history entry. |
| `entries` | `NavigationHistoryEntry[]` | The browser’s history entries. |
| `activation` | `NavigationActivation \| null` | How the document was opened. |
| `config` | `object` | The resolved settings. |

### `router.current`

Updated as soon as the URL commits.

| Key | Type | Description |
|---|---|---|
| `route` | `Route` | Matched [`Route`](/api/route/). |
| `url` | `string` | Full URL. |
| `pathname` | `string` | Pathname with `base` stripped. |
| `search` | `string` | Query string (`'?...'` or `''`). |
| `hash` | `string` | Fragment (`'#...'` or `''`). |
| `params` | `object` | Coerced path params with defaults filled in. |
| `query` | `object` | Coerced query values with defaults filled in. |
| `routes` | `Route[]` | Matched route chain from the root down to `route`. |
| `entry` | `NavigationHistoryEntry \| null` | Browser history entry. |
| `key` | `string \| null` | History slot key, for `traverseTo(key)`. |
| `id` | `string \| null` | History entry revision ID. |
| `state` | `any` | Value from `entry.getState()`. |

### `router.page`

Updated when guards, `data` and views have settled and rendered.

| Key | Type | Description |
|---|---|---|
| `status` | `'ok' \| 'notFound' \| 'forbidden' \| 'error'` | Outcome of the page load. |
| `route` | `Route` | Matched `Route`. |
| `url` | `string` | Page URL. |
| `params` | `object` | Coerced path params. |
| `query` | `object` | Coerced query values. |
| `data` | `object` | Data from every active route, merged from root down to leaf. |
| `title` | `string` | Page title (`titles[0] ?? ''`), also written to `document.title`. |
| `titles` | `string[]` | Non-empty titles from active routes, nearest first. |
| `view` | `any` | Resolved page view, or the status view when `status` is not `'ok'`. |
| `activeRoutes` | `Array<{ route, data, title }>` | Routes mounted on the page, from root down. |
| `error` | `any` | The thrown error when `status` is `'error'`. |
| `key` | `string \| null` | History entry `key` when the page settled. |
| `user` | `any` | `router.user` when the page settled. |

### `router.pending`

Set when a navigation starts, and cleared to `null` when it settles or fails.

| Key | Type | Description |
|---|---|---|
| `route` | `Route` | Target `Route`. |
| `url` | `string` | Target URL. |
| `params` | `object` | Target coerced path params. |
| `query` | `object` | Target coerced query values. |
| `routes` | `Route[]` | Target route chain from root to leaf. |
| `navigationType` | `'push' \| 'replace' \| 'reload' \| 'traverse'` | How the navigation was started. |
| `committed` | `boolean` | `true` once the URL has committed. |
| `loading` | `boolean` | `true` once `loadingDelay` has elapsed and the loading view is up. |
