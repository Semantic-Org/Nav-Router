---
title: Navigator
kind: class
lede: Connects a router to the browser Navigation API for link interception and history traversal.
import: import { Navigator, createNavigator } from 'nav-router'
updated: 2026-11-12
---

:::entry
### `createNavigator()` :kind[function]

```js signature
new Navigator(router)
createNavigator(router)
```

Wraps `window.navigation` for a [`Router`](/api/router/) instance, intercepting same-origin navigations that match a route and tracking session history entries. Every router creates its own adapter on `router.navigator`; in application code, call navigation methods on [`Router`](/api/router/#navigation) instead.

When `window.navigation` is unavailable, `navigate()` and `reload()` fall back to `window.location`.
:::

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `router` | `Router` | Owning [`Router`](/api/router/) instance. |
| `attached` | `boolean` | `true` while listening to `window.navigation` and `pageshow` events. |
| `entry` | `NavigationHistoryEntry \| null` | Current browser history entry (`navigation.currentEntry`). |
| `entries` | `NavigationHistoryEntry[]` | Session history entries from `navigation.entries()`. |
| `activation` | `NavigationActivation \| null` | How the document was initially opened (`navigation.activation`). |
| `transition` | `object \| null` | Active intercepted navigation (`navigationType`, `from`, `destination`, `url`), or `null` when idle. |
| `canGoBack` | `boolean` | `true` when the previous history entry is same-document and matches a route on `router`. |
| `canGoForward` | `boolean` | `true` when a forward history entry exists. |

## Lifecycle

:::entry
### `attach()` :kind[method]

```js signature
navigator.attach()
```

Subscribes to `window.navigation` and `pageshow` events and syncs initial history entries. Called automatically by [`router.start()`](/api/router/#start).
:::

:::entry
### `detach()` :kind[method]

```js signature
navigator.detach()
```

Removes the `window.navigation` and `window` listeners registered by `attach()`. Called automatically by [`router.stop()`](/api/router/#stop).
:::

## Navigation

:::entry
### `navigate()` :kind[method]

```js signature
navigator.navigate(url, options?)
```

Navigates to a resolved URL string via `navigation.navigate()` and returns `{ committed, finished }` promises. Unlike [`router.navigate()`](/api/router/#navigate), `url` must already be formatted with [`router.href()`](/api/router/#href).

**Parameters**

```params
- name: url
  type: string
  required: true
  description: Destination URL or pathname.
- name: options
  type: object
  default: "{}"
  description: Platform navigation options.
  options:
    - name: history
      type: "'auto' | 'push' | 'replace'"
      default: "'auto'"
      description: "'auto' replaces on the current URL and pushes otherwise; 'replace' keeps existing entry state unless `state` is set."
    - name: state
      type: unknown
      description: Structured-cloneable history entry state.
    - name: info
      type: unknown
      description: Ephemeral value exposed on `NavigateEvent.info`.
    - name: resetScroll
      type: boolean
      default: "true"
      description: Scrolls to top (or `#hash`) after the navigation settles.
    - name: resetFocus
      type: boolean
      default: "true"
      description: Resets focus after the navigation settles.
```
:::

:::entry
### `reload()` :kind[method]

```js signature
navigator.reload(options?)
```

Triggers an intercepted same-document reload via `navigation.reload()`, keeping scroll and focus in place and preserving entry `state` unless overridden via `options` (`state`, `info`). Returns `{ committed, finished }`.
:::

:::entry
### `back()` :kind[method]

```js signature
navigator.back(fallbackUrl?)
```

Steps back one history entry when `canGoBack` is `true`; otherwise pushes `fallbackUrl` (defaults to `router.config.base || '/'`). Returns `{ committed, finished }`.
:::

:::entry
### `forward()` :kind[method]

```js signature
navigator.forward()
```

Steps forward one history entry when `canGoForward` is `true`. Returns `{ committed, finished }`.
:::

:::entry
### `traverseTo()` :kind[method]

```js signature
navigator.traverseTo(key, options?)
```

Jumps to the history entry matching `key` via `navigation.traverseTo()`, accepting optional `info` in `options`. Returns `{ committed, finished }`.
:::

## Interception

:::entry
### `shouldIntercept()` :kind[method]

```js signature
navigator.shouldIntercept(event)
```

Returns `true` when `NavigateEvent` is eligible for router interception: `event.canIntercept` is `true`, the navigation is not a download, form submission, [`isExternalLink()`](#isexternallink) click, cross-origin URL, browser-initiated reload, or foreign same-URL `event.info` write.
:::

:::entry
### `isExternalLink()` :kind[method]

```js signature
navigator.isExternalLink(event)
```

Returns `true` when `event.sourceElement` carries `rel="external"`, allowing a same-origin link whose URL matches a route to leave the router for a full browser navigation.
:::
