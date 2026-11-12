---
title: Writing an integration
lede: This guide covers how framework packages connect component rendering and reactivity to `nav-router`.
updated: 2026-11-12
---

## The extension seam

A framework integration pairs two classes:

- **A [`View`](/api/view/) subclass** that mounts and updates framework components inside their target slots, then disposes them on teardown.
- **A [`Router`](/api/router/) or [`ReactiveRouter`](/api/reactive-router/) subclass** that sets `static View` and coordinates batching or signal tracking.

:::note
Official packages for Preact, Vue, Svelte, and Semantic UI are actively landing alongside `@nav-router/react` and `@nav-router/solid`. Build a custom integration when targeting another UI runtime or an internal component layer.
:::

## Subclassing `View`

Extend [`View`](/api/view/) from `'nav-router'` and set `static place` to match how your framework mounts into the DOM:

- **`'anchor'` (default)** — `View` inserts empty text-node anchors inside the target (`mount` or a `<slot>` element) and passes `target` and `anchor` to `create()`. Layouts write native `<slot>` and `<slot name="...">` elements in the DOM, as `@nav-router/solid` does.
- **`'element'`** — `View` hands the container `element` directly to `create()` without text anchors, fitting frameworks like React that mount a root onto a dedicated element.

Implement the lifecycle methods on your `View` subclass:

- **`create(options)`** — receives `view`, `context`, `target`, `anchor`, and `element`, and mounts the component.
- **`update(context)`** — passes new route `context` to the mounted component (or returns a replacement `View` instance).
- **`destroy()`** — unmounts or disposes framework state, then calls `super.destroy()` so `View` removes DOM anchors and restores any `<slot>` fallback nodes.
- **`findSlot()`** *(optional)* — override when nested layouts pass child views through your framework's component tree rather than DOM `<slot>` elements.

`@nav-router/react` overrides `findSlot()` to return the parent `ReactView` when inside a layout, falling back to `super.findSlot()` only at `mount`. That keeps the entire page inside a single React root so React Context flows across nested layouts while child views arrive as `children` or named slot props.

## Choosing `Router` vs. `ReactiveRouter`

Pick the router base class that matches how your framework updates rendered components.

### Snapshot and virtual-DOM frameworks

Extend [`Router`](/api/router/) from `'nav-router'` when components re-render from immutable props or external store subscriptions:

```js title="custom-router.js"
import { getRouter, Router, View } from 'nav-router';

export class CustomView extends View {
  static place = 'element';

  create({ view, context, element }) {
    this.mountRoot = mountFrameworkRoot(element, view, context);
  }

  update(context) {
    this.mountRoot.render(context);
  }

  destroy() {
    this.mountRoot.unmount();
    super.destroy();
  }
}

export class CustomRouter extends Router {
  static View = CustomView;

  batch(fn) {
    return flushFrameworkUpdates(fn);
  }
}
```

Override `batch(fn)` (such as `flushSync` in React) when multi-view updates should commit together, and pair `getRouter()` with `router.subscribe(listener)` to expose hooks like `useRouter(selector)`.

### Signal-based frameworks

Extend [`ReactiveRouter`](/api/reactive-router/) from `'nav-router/reactive'` when your framework tracks fine-grained signals. Supply the four reactivity hooks on your router subclass:

- **`createSignal(value, { equals })`** — returns `{ get, set, peek }` using the provided `equals` comparator.
- **`createReaction(fn)`** — runs `fn(isFirst)` immediately (`true` on the initial pass, `false` on re-runs) whenever tracked reads change, returning a `dispose` function.
- **`untrack(fn)`** — executes `fn()` without tracking dependencies.
- **`batch(fn)`** — coalesces signal writes inside `fn()`.

Inside `View.prototype.create()`, call `router.liveContext(context)` to convert static route context into `{ context: props, update }`. Properties on `props` (`params`, `query`, `user`, `page`, and per-key `data`) are reactive getters, so reading `props.data.team` tracks only `team` without re-creating kept layouts:

```js title="signal-router.js"
import { View } from 'nav-router';
import { ReactiveRouter } from 'nav-router/reactive';

export class SignalView extends View {
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

export class SignalRouter extends ReactiveRouter {
  static View = SignalView;

  createSignal(initialValue, { equals }) { /* return { get, set, peek } */ }
  createReaction(fn) { /* run fn(isFirst), return dispose */ }
  untrack(fn) { /* run fn untracked */ }
  batch(fn) { /* batch writes in fn */ }
}
```

## Package exports

Re-export `'nav-router'` alongside a `router` factory so applications import `router`, `navigate`, `href`, and `update` from a single package entry point:

```js title="index.js"
export * from 'nav-router';
export { SignalRouter, SignalView };

export const signalRouter = (options) => new SignalRouter(options);
export { signalRouter as router };
```
