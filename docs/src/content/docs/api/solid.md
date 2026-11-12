---
title: '@nav-router/solid'
lede: Renders Solid components with fine-grained reactive props and signal-tracked route hooks on nav-router.
import: import { router } from '@nav-router/solid'
updated: 2026-11-12
---

```bash
npm install nav-router @nav-router/solid
```

Requires `nav-router` (`^0.1.0`) and `solid-js` (`>=1.9`) as peer dependencies.

`@nav-router/solid` re-exports every class and helper from `nav-router` — including [`navigate()`](/api/router/#navigate), [`href()`](/api/router/#href), [`update()`](/api/update/), [`isActive()`](/api/is-active/), [`canAccess()`](/api/can-access/), and [`lazy()`](/api/lazy/) — while replacing `router` with `solidRouter`.

## Router

:::entry
### `router()` :kind[function]

```js signature
router(options?)
solidRouter(options?)
```

Creates a [`SolidRouter`](#solidrouter) from root [route options](/api/route-options/) and [router settings](/api/router/#settings). Also exported as `solidRouter` when importing alongside core's `router`.

**Example**

```tsx title="app.tsx"
import { href, isActive, router } from '@nav-router/solid';

function AppLayout() {
  return (
    <div class="shell">
      <nav>
        <a href={href('team', { org: 'acme' })} classList={{ active: isActive('team') }}>
          Acme
        </a>
      </nav>
      <main>
        <slot />
      </main>
    </div>
  );
}

function TeamPage(props) {
  return <h1>{props.data.team.name} ({props.params.org})</h1>;
}

const app = router({
  mount: '#app',
  layout: AppLayout,
  routes: [
    {
      name: 'team',
      path: '/teams/:org',
      async data({ params, signal }) {
        const res = await fetch(`/api/teams/${params.org}`, { signal });
        return { team: await res.json() };
      },
      view: TeamPage,
    },
  ],
});

await app.start();
```
:::

:::warning[Do not destructure component props]
`props.data`, `props.params`, `props.query`, `props.user`, and `props.page` are reactive getters. Read them inside JSX or reactive expressions (`props.data.team`) rather than destructuring `{ data }` at the top of your component.
:::

:::entry
### `SolidRouter` :kind[class]

```js signature
new SolidRouter(options?)
```

[`ReactiveRouter`](/api/reactive-router/) subclass wired to `solid-js` reactivity:

- **Signal-backed router state** — `router.current`, `router.page`, `router.pending`, `router.error`, `router.user`, `router.params`, `router.query`, and `router.canGoBack` are Solid signals. Reading them — or calling [`isActive()`](/api/is-active/) and [`isCurrent()`](/api/is-active/#iscurrent) — inside JSX or `createMemo()` subscribes automatically without a separate hook.
- **Reactive route hooks** — `identity`, `redirect`, `permission`, `data`, and `title` track any Solid signals they read and re-evaluate in place when those signals change.

Inherits all [`Router`](/api/router/) and [`ReactiveRouter`](/api/reactive-router/) properties and methods.
:::

## View adapter

:::entry
### `SolidView` :kind[class]

```js signature
class SolidView extends View
```

[`View`](/api/view/) adapter that mounts Solid components for `view`, `layout`, `slots`, and `statusViews`:

- **Fine-grained `props`** — Mounts each component once and updates `props` (`params`, `query`, `data`, `user`, `page`, `route`, `router`, `signal`, `activeRoutes`) through per-key signal getters. Navigating from `/teams/acme` to `/teams/globex` updates only the DOM expressions reading `props.params.org` or `props.data.team`.
- **Native `<slot>` outlets** — Layouts place child views and named slots with `<slot />` and `<slot name="sidebar" />`. Each view disposes its Solid root automatically when its route leaves.
:::
