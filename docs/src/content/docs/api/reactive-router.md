---
title: ReactiveRouter
kind: class
lede: Extends `Router` with signal-backed state and live route hooks for fine-grained reactive frameworks.
import: import { ReactiveRouter } from 'nav-router/reactive'
updated: 2026-11-12
---

:::entry
### `ReactiveRouter` :kind[class]

```js signature
class CustomRouter extends ReactiveRouter {
  static View = CustomView;
  createSignal(initialValue, { equals }) { /* ... */ }
  createReaction(fn) { /* ... */ }
}
```

Base [`Router`](/api/router/) subclass for fine-grained signal frameworks such as [`@nav-router/solid`](/api/solid/). Subclass `ReactiveRouter`, connect its signal methods to your framework's reactivity runtime, and pair it with a [`View`](/api/view/) subclass that passes [`liveContext()`](#livecontext) to components.

Every setting and navigation method from [`Router`](/api/router/) works unchanged.
:::

## Reactive state and hooks

`ReactiveRouter` makes router state and route hooks reactive without extra subscriptions:

- **Router properties** — Reading `page`, `current`, `pending`, `error`, `user`, `canGoBack`, `canGoForward`, `entry`, `entries`, or `transition` inside a framework effect or template tracks updates automatically.
- **Per-key `params` and `query`** — `router.params` and `router.query` track individual keys (`router.params.org` wakes readers only when `org` changes).
- **Live route hooks** — `data`, `permission`, `redirect`, `title`, `identity`, and plugin hooks (such as `meta` in [`head`](/plugins/head/)) run inside `createReaction()`. When a signal read inside a hook changes while its route is on the current page, that hook re-evaluates in place:
  - **`data`** updates changed keys per property, or transitions to and from `statusViews.notFound` on `notFound()`.
  - **`permission`** reloads into a previously forbidden route when access is granted, or redirects / shows `statusViews.forbidden` when revoked.
  - **`redirect`** replaces the current URL when it resolves to a target.
  - **`title`** updates `page.title` and `document.title`.

## View context

:::entry
### `liveContext()` :kind[method]

```js signature
const { context, update } = router.liveContext(initialContext)
```

Wraps a `View` render context in per-key reactive getters for `params`, `query`, `data`, `user`, `page`, and `activeRoutes` alongside `route`, `router`, and `signal`. Call `liveContext(context)` in [`View.create()`](/api/view/#create) and pass subsequent [`View.update(next)`](/api/view/#update) contexts to `update(next)`:

```js
class SignalView extends View {
  create({ view, context, target, anchor }) {
    const { context: props, update } = this.router.liveContext(context);
    this.tell = update;
    this.dispose = mountComponent(view, props, target, anchor);
  }

  update(context) {
    this.tell(context);
  }

  destroy() {
    this.dispose?.();
    super.destroy();
  }
}
```
:::

## Signal primitives

Implement these methods on a `ReactiveRouter` subclass to wire your framework's signal runtime:

:::entry
### `createSignal()` :kind[method]

```js signature
createSignal(initialValue, { equals }?)
```

**Required.** Creates a reactive cell initialized to `initialValue` using `equals(prev, next)` to skip unchanged writes. Must return `{ get, set, peek }`, where `get()` tracks the read, `set(value)` writes a new value, and `peek()` reads without tracking.
:::

:::entry
### `createReaction()` :kind[method]

```js signature
createReaction(fn)
```

**Required.** Runs `fn(true)` synchronously on creation, tracks signals read during execution, and re-runs `fn(false)` whenever a tracked signal changes. Must return a `dispose()` function that stops future runs.
:::

:::entry
### `untrack()` :kind[method]

```js signature
untrack(fn)
```

Runs `fn()` without recording signal dependencies and returns its result. Defaults to calling `fn()` directly; override with your runtime's `untrack` helper.
:::

:::entry
### `batch()` :kind[method]

```js signature
batch(fn)
```

Coalesces multiple signal writes inside `fn()` into a single notification flush and returns `fn()`'s result. Defaults to calling `fn()` directly; override with your runtime's `batch` helper.
:::
