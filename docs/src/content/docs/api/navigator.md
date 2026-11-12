---
title: Navigator
kind: class
lede: Listens on `window.navigation`, decides which navigations the router takes and which stay with the browser, runs the navigation verbs, and remembers inner scroll positions.
import: import { Navigator, createNavigator } from 'nav-router'
updated: 2026-11-11
---

## How it connects to the router

Every [`Router`](/api/router/) creates its own `Navigator` as `router.navigator`. `router.start()` attaches its listeners, `router.stop()` detaches them, and the router’s navigation verbs (`router.navigate()`, `router.back()`, `router.reload()`) build the URL and call through to `router.navigator`.

To construct one directly in a custom setup or test, call `createNavigator(router)` or `new Navigator(router)`.

:::entry
### `createNavigator()` :kind[function]

```js signature
createNavigator(router): Navigator
```

Creates a `Navigator` bound to `router`.
:::

## Which navigations it takes

When a link click, back/forward button or router call fires `navigate` on `window.navigation`, the navigator intercepts it only when it belongs to the app. It leaves the navigation to the browser when:

| Navigation | Why the browser handles it |
|---|---|
| `!event.canIntercept` | Cross-document history step or unrewritable URL. |
| `event.downloadRequest` | An `<a download>` link. |
| `event.formData` | A `POST` form submission. |
| Another origin, or outside `base` | External link or another app on the same domain. |
| Unmatched path | `router.match()` returned `null`. |
| Browser reload button | Full document reload. |
| Same-page `#hash` jump | Route, params and query are unchanged, so the browser scrolls to the anchor. |

When only `query` changes on the current route and params, the navigator tells the browser to leave scroll and focus where they are so filter and search inputs don’t jump.

## Scroll memory

The browser restores window scroll on back and forward (`traverse`). To also restore scrollable containers inside your layout, pass their CSS selector (or an array of selectors) to the router’s `restoreScroll` setting:

```js for="core" label="routes.js"
import { router } from 'nav-router';

export const app = router({
  restoreScroll: ['#sidebar-scroll', '#feed-scroll'],
  layout: TeamLayout,
  routes: {
    members: { path: '/team/:org/members', view: MembersPage },
    member: { path: '/team/:org/:userId', view: MemberPage },
  },
});
```

Before leaving an entry, the navigator saves each container’s `{ top, left }` scroll offset onto the history entry’s state, and restores it after a `traverse` navigation renders.

## Methods

:::entry
### `navigate()` :kind[method]

```js signature
navigator.navigate(url, options?): { committed, finished }
```

Navigates to a URL string via `window.navigation.navigate()`. Use [`router.navigate()`](/api/router/#navigate) to navigate by route name and params; use `navigator.navigate()` in a plugin when you already have a resolved URL.

**Parameters**

```params
- name: url
  type: string
  required: true
  description: The URL to navigate to.
- name: options
  type: '{ history, state, info, resetScroll, resetFocus }'
  default: '{}'
  description: History and scroll/focus options, as in [`router.navigate()`](/api/router/#navigate).
```
:::

:::entry
### `reload()` :kind[method]

```js signature
navigator.reload(options?): { committed, finished }
```

Reloads the current entry in-app without resetting scroll or focus.
:::

:::entry
### `back()` :kind[method]

```js signature
navigator.back(fallbackUrl?): { committed, finished }
```

Goes back one entry when `canGoBack` is `true`, or pushes `fallbackUrl` (`router.config.base || '/'` by default) when there is no earlier entry in this app.
:::

:::entry
### `forward()` :kind[method]

```js signature
navigator.forward(): { committed, finished }
```

Goes forward one entry when `canGoForward` is `true`.
:::

:::entry
### `traverseTo()` :kind[method]

```js signature
navigator.traverseTo(key, options?): { committed, finished }
```

Jumps to the history entry with the given `key`.
:::

:::entry
### `shouldIntercept()` :kind[method]

```js signature
navigator.shouldIntercept(event): boolean
```

Whether a `NavigateEvent` is eligible for interception before route matching runs.
:::

:::entry
### `saveScroll()` :kind[method]

```js signature
navigator.saveScroll()
```

Writes the current scroll offsets for `router.config.restoreScroll` onto the current history entry.
:::

:::entry
### `restoreScroll()` :kind[method]

```js signature
navigator.restoreScroll(entry)
```

Restores the scroll offsets stored on `entry` to the elements matching `router.config.restoreScroll`.
:::

:::entry
### `attach()` :kind[method]

```js signature
navigator.attach()
```

Attaches the `window.navigation` and `pageshow` listeners. Called by `router.start()`.
:::

:::entry
### `detach()` :kind[method]

```js signature
navigator.detach()
```

Removes the listeners attached by `attach()`. Called by `router.stop()`.
:::

## Properties

`entry`, `entries`, `activation`, `transition`, `canGoBack` and `canGoForward` are also exposed on [`Router`](/api/router/).

| Property | Type | Description |
|---|---|---|
| `router` | `Router` | The router this navigator belongs to. |
| `attached` | `boolean` | Whether the navigator is listening on `window.navigation`. |
| `entry` | `NavigationHistoryEntry \| null` | The browser’s `navigation.currentEntry`. |
| `entries` | `NavigationHistoryEntry[]` | The browser’s `navigation.entries()` list. |
| `activation` | `NavigationActivation \| null` | The document’s `navigation.activation`. |
| `transition` | `{ navigationType, from, destination, url } \| null` | The intercepted navigation in flight, or `null`. |
| `canGoBack` | `boolean` | Whether the previous history entry is same-document and matches a route in this router. |
| `canGoForward` | `boolean` | Whether `navigation.canGoForward` is `true`. |

## Related

- [`Router`](/api/router/): route-based navigation verbs and settings.
- [Moments](/api/moments/): wrapping `Navigator.prototype` and `Router.prototype` methods in a plugin.
- [Back and forward](/examples/back-and-forward/): `entries`, `traverseTo()`, `canGoBack` and `restoreScroll` in the playground.
