---
title: Router
kind: class
lede: Holds the route tree, runs each navigation from the `navigate` event to the rendered page, and keeps the current page. An app has one.
import: import { Router } from 'nav-router'
size: core
updated: 2026-11-05
---

## Create a router

Pass one options object. Keys the router declares are its settings; every other key belongs to the root route, so a small app reads as a single tree.

```js for="core vue svelte semantic" label="routes.js"
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

```jsx for="react preact" label="routes.jsx"
import { router } from '@nav-router/react';

export const app = router({
  // settings
  holdCommit: '300ms',
  signInRoute: 'signIn',
  // the root route
  layout: RootLayout,
  index: { path: '/', view: HomePage },
});
```

```tsx for="solid" label="routes.tsx"
import { router } from '@nav-router/solid';

export const app = router({
  // settings
  holdCommit: '300ms',
  signInRoute: 'signIn',
  // the root route
  layout: RootLayout,
  index: { path: '/', view: HomePage },
});
```

:::note[An unknown key lands on the root route]
A key that is neither a setting nor a route option is kept on the root route unchecked. A misspelled setting is not an error, so check `router.config` when a setting seems ignored.
:::

## Settings

Every setting and its default. The resolved values are on `router.config`.

| Setting | Type | Default | Description |
|---|---|---|---|
| `base` | `string` | `''` | Path prefix the app is served under. |
| `holdCommit` | `duration` | `'300ms'` | How long the URL waits for guards and data before committing. A fast load settles before the URL moves. |
| `loadingDelay` | `duration` | `'200ms'` | Time after commit before the loading view shows. |
| `loadingMin` | `duration` | `'500ms'` | Once shown, how long the loading view stays, so it never flickers. |
| `statusViews` | `object` | `{}` | Views for `loading`, `notFound`, `forbidden` and `error`. |
| `signInRoute` | `string` | `null` | Where a refused guard sends a signed-out user. |
| `errorRoute` | `string` | `null` | Where a navigation that throws is sent. |
| `identity` | `value \| function` | `null` | The user guards read: a value, or a function of the navigation returning one or a promise of one. |
| `restoreScroll` | `string` | `null` | Selector of an inner scroller whose position is restored on back and forward. |
| `attachGlobal` | `string` | `'router'` | Name the router is exposed under on `window`, for the console. |
| `onChange` | `function` | `null` | Called when the page or pending state changes. |
| `onRender` | `function` | `null` | Called after each render. |

:::tip[See the timing settings run]
The trace on the [homepage](/) plays one navigation against `holdCommit`, `loadingDelay` and `loadingMin`.
:::

## Methods

Each method is also exported as a function that acts on the page’s router, so a view can call `navigate()` without holding it.

::::entry
### `navigate()` :kind[method]

```js signature
router.navigate(target, args?, options?): { committed, finished }
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
### `href()` :kind[method]

```js signature
router.href(target, args?, options?): string
```

Builds the URL `navigate()` would go to, without going. Use it for `<a href>`, so links stay plain anchors.

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
### `back()` :kind[method]

```js signature
router.back(fallback?, args?)
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

## Properties

| Property | Type | Description |
|---|---|---|
| `current` | `Match` | The committed match: route, params, query and chain. |
| `page` | `Page` | What is on screen, including its status. |
| `pending` | `Pending \| null` | The navigation in flight, with `committed` and `loading` flags. |
| `canGoBack` | `boolean` | Whether there is an earlier entry in this app. |
| `canGoForward` | `boolean` | Whether there is a later entry. |
| `config` | `object` | The resolved settings. |

:::danger[Don’t write to these]
The properties are read-only views of the router’s state. Change the page with `navigate()`, or a route’s data with `update()`.
:::
