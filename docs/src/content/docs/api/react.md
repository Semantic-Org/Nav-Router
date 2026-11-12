---
title: '@nav-router/react'
lede: Renders React 19 components as route views and nested layouts with synchronous navigation commits.
import: import { router, useRouter } from '@nav-router/react'
updated: 2026-11-12
---

```bash
npm install nav-router @nav-router/react
```

Requires `nav-router` (`^0.1.0`), `react` (`>=19`), and `react-dom` (`>=19`) as peer dependencies.

`@nav-router/react` re-exports every class and helper from `nav-router` — including [`navigate()`](/api/router/#navigate), [`href()`](/api/router/#href), [`update()`](/api/update/), [`isActive()`](/api/is-active/), [`canAccess()`](/api/can-access/), and [`lazy()`](/api/lazy/) — while replacing `router` with `reactRouter`.

## Router and hooks

:::entry
### `router()` :kind[function]

```js signature
router(options?)
reactRouter(options?)
```

Creates a [`ReactRouter`](#reactrouter) from root [route options](/api/route-options/) and [router settings](/api/router/#settings). Also exported as `reactRouter` when importing alongside core's `router`.

**Example**

```jsx title="app.jsx"
import { href, router } from '@nav-router/react';

function AppLayout({ children, sidebar }) {
  return (
    <div className="shell">
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

function TeamPage({ data, params }) {
  return <h1>{data.team.name} ({params.org})</h1>;
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
      slots: {
        sidebar: ({ params }) => <a href={href('team', { org: params.org })}>Overview</a>,
      },
      view: TeamPage,
    },
  ],
});

await app.start();
```
:::

:::entry
### `ReactRouter` :kind[class]

```js signature
new ReactRouter(options?)
```

[`Router`](/api/router/) subclass for React apps. Commits page updates with `flushSync` from `react-dom` so rendered views stay in step with URL and scroll changes.

Inherits all [`Router`](/api/router/) properties and methods.
:::

:::entry
### `useRouter()` :kind[function]

```js signature
useRouter(read)
```

Subscribes a component to the active router via `useSyncExternalStore` and re-renders whenever the value returned by `read(router)` changes (`Object.is`).

Use `useRouter()` inside persistent layouts or standalone components (such as nav links or loading bars) that subscribe to URL or `pending` state without re-rendering parent layouts.

**Parameters**

```params
- name: read
  type: "(router: ReactRouter) => T"
  required: true
  description: Selector function called with the active router from [`getRouter()`](/api/router/#getrouter). Required — calling `useRouter()` without `read` throws.
```

**Returns**

```returns
type: T
description: Current value returned by `read(router)`.
```

**Example**

```jsx title="nav-link.jsx"
import { href, isActive, useRouter } from '@nav-router/react';

export function NavLink({ to, args, children }) {
  const active = useRouter(() => isActive(to, args));
  return (
    <a href={href(to, args)} className={active ? 'active' : undefined}>
      {children}
    </a>
  );
}

export function LoadingBar() {
  const loading = useRouter((r) => Boolean(r.pending?.loading));
  return loading ? <div className="loading-bar" role="status" /> : null;
}
```
:::

:::warning[Return stable selector values]
`useSyncExternalStore` compares snapshots with `Object.is`. Return a primitive (`Boolean(r.pending)`, `isActive('team')`) or an existing router reference (`r.user`, `r.page`) rather than a fresh `{ ... }` object or `[...]` array literal on every call, which triggers an infinite re-render loop.
:::

## View adapter

:::entry
### `ReactView` :kind[class]

```js signature
class ReactView extends View
```

[`View`](/api/view/) adapter that renders React components for `view`, `layout`, `slots`, and `statusViews`:

- **Component props** — Passes `params`, `query`, `data`, `user`, `page`, `route`, `router`, `signal`, and `activeRoutes` as props.
- **Children and named slots** — Passes child views to parent layouts as `children`, or as named props matching `route.slots` (such as `sidebar`). React Context providers in a layout wrap every nested view below it, and navigating between child pages only re-renders the changed slot.
- **Error boundaries** — Isolates render errors per view, forwarding them to `router.onError(error, context)` while keeping parent layouts mounted.
:::
