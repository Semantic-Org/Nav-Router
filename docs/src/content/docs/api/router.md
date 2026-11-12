---
title: Router
kind: class
lede: Matches URLs against your routes and renders the active page.
import: import { router, Router } from 'nav-router'
size: core
updated: 2026-11-12
---

:::entry
### `router()` :kind[function]

```js signature
router(options?)
new Router(options?)
```

Creates a router. `options` includes both the root node's [route options](/api/route-options/) and the router [settings](#settings) below.

With React or Solid, import `router` from `@nav-router/react` or `@nav-router/solid` instead.

**Example**

```js for="core" label="app.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  layout: () => '<nav><a href="/">Home</a></nav><main><slot></slot></main>',
  index: { view: () => '<h1>Home</h1>' },
  routes: [
    { name: 'sign-in', path: '/sign-in', view: () => '<h1>Sign in</h1>' },
  ],
});

await app.start();
```

```jsx for="react" label="app.jsx"
import { router } from '@nav-router/react';

function AppLayout({ children }) {
  return (
    <>
      <nav><a href="/">Home</a></nav>
      <main>{children}</main>
    </>
  );
}

const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  layout: AppLayout,
  index: { view: () => <h1>Home</h1> },
  routes: [
    { name: 'sign-in', path: '/sign-in', view: () => <h1>Sign in</h1> },
  ],
});

await app.start();
```

```tsx for="solid" label="app.tsx"
import { router } from '@nav-router/solid';

function AppLayout() {
  return (
    <>
      <nav><a href="/">Home</a></nav>
      <main><slot /></main>
    </>
  );
}

const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  layout: AppLayout,
  index: { view: () => <h1>Home</h1> },
  routes: [
    { name: 'sign-in', path: '/sign-in', view: () => <h1>Sign in</h1> },
  ],
});

await app.start();
```
:::

## Settings

Pass any of these to `router(options)`:

```params
- name: base
  type: string
  default: "''"
  description: Subpath prefix when your app isn't served at `'/'` (for example, `'/docs'`).
- name: mount
  type: "string | Element"
  default: "'body'"
  description: Selector or element where the app renders.
- name: signInRoute
  type: "string | Route | null"
  default: "null"
  description: Route to redirect signed-out users to (with `?returnTo=...`) when a `permission` guard denies access.
- name: identity
  type: "unknown | ((navigation) => unknown | Promise<unknown>)"
  default: "null"
  description: Value or async function that resolves `router.user` before guards run.
- name: user
  type: unknown
  default: "null"
  description: Initial value for `router.user`.
- name: holdCommit
  type: "string | number"
  default: "'300ms'"
  description: How long to wait for fast `data` before committing the new URL. Set `0` to commit immediately.
- name: loadingDelay
  type: "string | number"
  default: "'200ms'"
  description: Delay after URL commit before showing `statusViews.loading`.
- name: loadingMin
  type: "string | number"
  default: "'500ms'"
  description: Minimum time `statusViews.loading` stays visible once shown, preventing flicker.
- name: restoreScroll
  type: "string | string[] | null"
  default: "null"
  description: Selector (or array of selectors) for inner scroll containers to restore on Back/Forward. Window scroll is automatic.
- name: attachGlobal
  type: "string | false"
  default: "'router'"
  description: Window property name for the started router (`window.router`), or `false` to disable.
- name: onRender
  type: "(page, event) => void | Promise<void>"
  default: "null"
  description: Called after each page or loading view renders.
- name: onChange
  type: "(router) => void"
  default: "null"
  description: Called whenever router state changes.
- name: onError
  type: "(error, context?) => void"
  default: "console.error"
  description: Called on uncaught errors in `data` or views.
- name: dataChanged
  type: "(previous, next) => boolean"
  default: "!isEqual(next, previous)"
  description: Custom equality check for `user` and reactive `data` updates.
```

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `page` | `object \| null` | Rendered page (`url`, `params`, `query`, `data`, `status`, `title`, `route`, `error`), or `null` before first render. |
| `current` | `object \| null` | Committed URL match (`route`, `url`, `params`, `query`, `entry`, `state`). Moves ahead of `page` while slow `data` loads. |
| `pending` | `object \| null` | In-flight navigation (`route`, `url`, `navigationType`, `loading`, `committed`), or `null` when idle. |
| `error` | `object \| null` | Last navigation error (`error`, `from`, `url`), cleared once a later navigation succeeds. |
| `user` | `unknown` | Current user read by guards, `data`, and views. |
| `canGoBack` | `boolean` | `true` when the previous history entry matches a route on this router. |
| `canGoForward` | `boolean` | `true` when a forward history entry exists. |
| `entry` | `NavigationHistoryEntry \| null` | Current browser history entry. |
| `entries` | `NavigationHistoryEntry[]` | All session history entries. |
| `activation` | `NavigationActivation \| null` | How the document was initially opened. |
| `transition` | `object \| null` | Active platform navigation while one is in flight. |
| `root` | `Route` | Root [`Route`](/api/route/) of the route tree. |
| `config` | `object` | Resolved router settings. |
| `navigator` | `Navigator` | Underlying [`Navigator`](/api/navigator/) wrapper around `window.navigation`. |

## Lifecycle

:::entry
### `start()` :kind[method]

```js signature
await router.start()
```

Renders the current URL and begins intercepting links and history navigation. Resolves once the initial page renders.
:::

:::entry
### `stop()` :kind[method]

```js signature
router.stop()
```

Unmounts rendered views and stops listening for navigation. Useful in tests or embedded apps.
:::

:::entry
### `subscribe()` :kind[method]

```js signature
const unsubscribe = router.subscribe(listener)
```

Calls `listener(router)` whenever router state changes, and returns an `unsubscribe` function.
:::

## Defining routes

Pass routes up front in `router({ index, routes })`, or add them with the methods below (before or after `start()`).

:::entry
### `index()` :kind[method]

```js signature
router.index(options)
```

Defines the `'/'` page from [route options](/api/route-options/). Returns the new index [`Route`](/api/route/).
:::

:::entry
### `section()` :kind[method]

```js signature
router.section(options)
```

Groups child routes under a shared path prefix, layout, guard, or `data` loader. Returns the new section [`Route`](/api/route/) so you can add child routes to it:

```js
const settings = app.section({ path: '/settings', layout: SettingsLayout });
settings.route({ name: 'profile', path: '/settings/profile', view: ProfileView });
settings.route({ name: 'billing', path: '/settings/billing', view: BillingView });
```
:::

:::entry
### `route()` :kind[method]

```js signature
router.route(options)
```

Adds a child route from [route options](/api/route-options/). Returns the new [`Route`](/api/route/).
:::

## Navigation

Each method below can also be imported directly from `nav-router` (`navigate`, `replace`, `reload`, `back`, `forward`, `traverseTo`) without passing your router around.

:::entry
### `navigate()` :kind[method]

```js signature
router.navigate(target, args?, options?)
navigate(target, args?, options?)
```

Navigates to a route name, `Route`, or path. Keys in `args` matching `:params` fill the path; remaining keys become query parameters.

Returns `{ committed, finished }` promises if you need to wait for the URL or data to settle.

**Parameters**

```params
- name: target
  type: "string | Route"
  required: true
  description: Route name, `Route` instance, or path.
- name: args
  type: object
  default: "{}"
  description: Path parameters and query values.
- name: options
  type: object
  default: "{}"
  description: Navigation options.
  options:
    - name: history
      type: "'auto' | 'push' | 'replace'"
      default: "'auto'"
      description: "'auto' pushes on a new URL and replaces on the current URL."
    - name: state
      type: unknown
      description: Structured-cloneable history entry state.
    - name: info
      type: unknown
      description: Ephemeral value passed on `NavigateEvent.info` for this navigation.
    - name: hash
      type: string
      description: URL fragment (without `#`).
    - name: keepQuery
      type: boolean
      default: "false"
      description: Keeps current query parameters unless overridden in `args`.
    - name: absolute
      type: boolean
      default: "false"
      description: Prepends `location.origin`.
    - name: resetScroll
      type: boolean
      default: "true"
      description: Scrolls to top (or `#hash`) on settle. Automatically `false` on query-only updates.
    - name: resetFocus
      type: boolean
      default: "true"
      description: Resets focus on settle. Automatically `false` on query-only updates.
```

**Example**

```js
import { navigate } from 'nav-router';

navigate('member', { org: 'acme', id: 42, tab: 'activity' });
await navigate('/settings/profile', {}, { history: 'replace' }).finished;
```
:::

:::entry
### `replace()` :kind[function]

```js signature
replace(target, args?, options?)
```

Navigates like `navigate()`, replacing the current history entry instead of pushing a new one. To update params or query on the current route without resetting scroll or focus, use [`update()`](/api/update/).
:::

:::entry
### `reload()` :kind[method]

```js signature
router.reload(options?)
reload(options?)
```

Re-runs guards and `data` for the current URL without a full browser reload, keeping scroll and focus in place.
:::

:::entry
### `back()` :kind[method]

```js signature
router.back(fallback?, args?)
back(fallback?, args?)
```

Steps back when the previous history entry belongs to this router; otherwise navigates to `fallback` (defaults to `'/'`) so in-app Back buttons never leave your site.
:::

:::entry
### `forward()` :kind[method]

```js signature
router.forward()
forward()
```

Steps forward one history entry when `canGoForward` is `true`.
:::

:::entry
### `traverseTo()` :kind[method]

```js signature
router.traverseTo(key, options?)
traverseTo(key, options?)
```

Jumps to a history entry in `router.entries` by its `key`.
:::

## URLs and matching

:::entry
### `href()` :kind[method]

```js signature
router.href(target, args?, options?)
href(target, args?, options?)
```

Builds a URL from a route name, `Route`, or path, prepending `base` and omitting query values equal to their `default`. Boolean query params serialize as bare flags (`?archived`). Also exported as `url()` and `urlFor()`.

**Parameters**

```params
- name: target
  type: "string | Route"
  required: true
  description: Route name, `Route` instance, or path.
- name: args
  type: object
  default: "{}"
  description: Path parameters and query values.
- name: options
  type: "{ hash?: string, keepQuery?: boolean, absolute?: boolean }"
  default: "{}"
  description: Optional `#hash`, `keepQuery`, or `absolute` URL formatting.
```

**Example**

```js
import { href } from 'nav-router';

href('member', { org: 'acme', id: 42 });
// => '/teams/acme/members/42'

href('issues', { org: 'acme', status: 'closed', archived: true });
// => '/projects/acme/issues?status=closed&archived'
```
:::

:::entry
### `match()` :kind[method]

```js signature
router.match(url)
match(url)
```

Matches a URL against your routes without navigating. Returns `{ route, url, params, query, routes }` or `null`.
:::

## Active instance

:::entry
### `getRouter()` :kind[function]

```js signature
getRouter()
setRouter(instance)
```

Returns the active router registered by `start()`. Call `setRouter(instance)` in unit tests or when running multiple routers.
:::
