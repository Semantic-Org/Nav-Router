---
title: View
kind: class
lede: Renders and updates route views inside DOM slots or UI framework component trees.
import: import { View, DomView } from 'nav-router'
updated: 2026-11-12
---

:::entry
### `View` :kind[class]

```js signature
class CustomView extends View {
  static place = 'anchor';
  create({ view, context, target, anchor, element }) {}
  update(context) {}
  destroy() { super.destroy(); }
}
```

Base adapter class for rendering a route's views and layouts onto the page. Plain JavaScript apps use [`DomView`](#domview) by default; UI framework integrations extend `View` and assign `static View` on their [`Router`](/api/router/) or [`ReactiveRouter`](/api/reactive-router/) subclass.
:::

:::entry
### `View.place` :kind[property]

```js signature
static place = 'anchor' // 'anchor' | 'element'
```

Controls how `View` prepares the DOM container returned by `findSlot()`:

- **`'anchor'`** (default) — inserts paired boundary text nodes inside `target` and passes the closing node as `anchor` to `create()`, leaving sibling nodes untouched (used by `DomView` and `@nav-router/solid`).
- **`'element'`** — hands `target` directly to `create()` without boundary nodes so a framework root can own the container (used by `@nav-router/react`).
:::

## Properties

| Property | Type | Description |
| --- | --- | --- |
| `router` | `Router` | Owning [`Router`](/api/router/) instance. |
| `route` | `Route` | [`Route`](/api/route/) whose context started this view. |
| `view` | `unknown` | Resolved view function, component, or node from the route configuration. |
| `parent` | `View \| null` | Nearest rendered ancestor layout `View`, or `null` at the mount root. |
| `ancestors` | `View[]` | Rendered ancestor layout `View` instances, nearest first. |
| `slot` | `string \| undefined` | Named slot key when filling `route.slots`, or `undefined` for the default slot. |
| `target` | `Node \| unknown` | Container returned by `findSlot()`. |
| `nodes` | `Node[]` | Live DOM nodes currently rendered by this view. |

## Subclass methods

:::entry
### `create()` :kind[method]

```js signature
view.create({ view, context, target, anchor, element })
```

Mounts `view` into `target` (inserting before `anchor` when `View.place` is `'anchor'`).

**Parameters**

```params
- name: view
  type: unknown
  description: Resolved view function, component, or DOM value.
- name: context
  type: object
  description: Render context containing `route`, `router`, `params`, `query`, `data`, `user`, `signal`, `activeRoutes`, and `page`.
- name: target
  type: "Node | unknown"
  description: Container returned by `findSlot()`.
- name: anchor
  type: "Text | undefined"
  description: Closing boundary text node to insert before when `View.place` is `'anchor'`.
- name: element
  type: "Node | unknown"
  description: Alias for `target`.
```
:::

:::entry
### `update()` :kind[method]

```js signature
view.update(context)
```

Updates a mounted view when route parameters, query values, or ancestor `data` change. Return `undefined` when updating in place, or return a replacement `View` instance if the view was recreated.
:::

:::entry
### `destroy()` :kind[method]

```js signature
view.destroy()
```

Unmounts the view when its route deactivates or swaps views. Subclasses dispose their framework root first, then call `super.destroy()` to remove rendered DOM nodes and restore any `<slot>` fallback content.
:::

:::entry
### `findSlot()` :kind[method]

```js signature
view.findSlot()
```

Locates the container this view mounts into. By default, returns the `mount` element at the root, or searches ancestor layout DOM (including open `shadowRoot` trees) for `<slot>` or `<slot name="...">`. Override `findSlot()` when your framework passes slots as component props instead of `<slot>` elements.
:::

## Built-in DOM view

:::entry
### `DomView` :kind[class]

```js signature
Router.View // DomView in browsers, null when document is undefined
```

Default `Router.View` built into `nav-router` core. `DomView` renders an HTML string, `Node`, `DocumentFragment`, array of `Node` values, or a `(context) => ...` function returning any of those, and projects nested views into `<slot>` and `<slot name="...">` elements (including Web Component shadow roots).

On `update(context)`, `DomView` re-renders in place and restores focus and text selection when the previously focused control has an `id`.

**Example**

```js
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  layout: () => `
    <aside><slot name="sidebar">Default sidebar</slot></aside>
    <main><slot></slot></main>
  `,
  routes: [
    {
      name: 'team',
      path: '/teams/:org',
      slots: { sidebar: ({ params }) => `<nav>${params.org} menu</nav>` },
      view: ({ params }) => `<h1>Team ${params.org}</h1>`,
    },
  ],
});
```
:::
