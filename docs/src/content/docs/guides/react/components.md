---
title: Components and hooks
lede: This guide covers view props, nested layouts with React Context, live subscriptions via `useRouter()`, and render error isolation.
updated: 2026-11-12
---

## View and layout props

Every `view`, `layout`, named slot component, and status view receives the active route context as props:

```jsx title="MemberPage.jsx"
export function MemberPage({ params, query, data, user }) {
  return (
    <article>
      <h1>{data.member.name}</h1>
      <p>Team: {params.org} · Tab: {query.tab}</p>
      {user?.role === 'admin' && <button type="button">Edit role</button>}
    </article>
  );
}
```

Alongside `params`, `query`, `data`, and `user`, components receive:

- **`page`** — the rendered page snapshot, including `page.url`, `page.status`, `page.title`, and `page.error` (useful in `statusViews.error` or `statusViews.notFound`)
- **`children`** — the active child layout or page element when rendering a `layout`
- **Named slot props** — an element for each filled slot (such as `sidebar`), or `undefined` when unfilled
- **`route`**, **`router`**, and **`signal`** — the owning [`Route`](/api/route/), `ReactRouter` instance, and an `AbortSignal` that aborts when the route deactivates

## Layouts, slots, and React Context

`@nav-router/react` mounts a single React root at `mount` and renders child views and [named slots](/guides/layouts-and-slots/) inside their parent layout's component tree:

```jsx title="TeamLayout.jsx"
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext('light');
export const useTheme = () => useContext(ThemeContext);

export function TeamLayout({ data, sidebar, children }) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={theme}>
      <div className="workspace" data-theme={theme}>
        <header>
          <h2>{data.team.name}</h2>
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            Toggle theme
          </button>
        </header>
        <aside>{sidebar ?? <p>No sidebar</p>}</aside>
        <section>{children}</section>
      </div>
    </ThemeContext.Provider>
  );
}
```

```jsx title="routes.jsx"
app.section({
  path: '/teams/:org',
  layout: TeamLayout,
  slots: { sidebar: TeamSidebar },
  async data({ params, signal }) {
    const res = await fetch(`/api/teams/${params.org}`, { signal });
    return { team: await res.json() };
  },
  routes: [
    {
      name: 'member',
      path: '/teams/:org/members/:id',
      view: MemberPage,
    },
    {
      name: 'print',
      path: '/teams/:org/print',
      slots: { sidebar: null },
      view: PrintPage,
    },
  ],
});
```

- **React Context flows into child routes.** Because `sidebar` and `children` render inside `<ThemeContext.Provider>`, `MemberPage` and `TeamSidebar` can call `useTheme()` directly.
- **Layouts stay mounted across child navigations.** Moving from `/teams/acme/members/1` to `/teams/acme/members/2` swaps `{children}` in place while `TeamLayout` keeps its local `theme` state without re-rendering.

## Reading router state with `useRouter()`

Components outside the leaf view — such as navigation links or a loading indicator in your header — can subscribe to live router state with [`useRouter()`](/api/react/#userouter):

```jsx title="HeaderNav.jsx"
import { href, isActive, useRouter } from '@nav-router/react';

export function SectionLink({ route, label }) {
  const active = useRouter(() => isActive(route));
  return (
    <a href={href(route)} aria-current={active ? 'page' : undefined}>
      {label}
    </a>
  );
}

export function LoadingBadge() {
  const loading = useRouter((r) => Boolean(r.pending?.loading));
  return loading ? <span className="badge">Loading…</span> : null;
}
```

`useRouter(read)` always takes a selector function. Backed by React's `useSyncExternalStore`, it calls `read(router)` on router updates and re-renders your component only when the selected value changes (`Object.is`) — whether you read `r.pending`, `r.user`, `r.canGoBack`, or call [`isActive()`](/api/is-active/).

:::tip[Select primitives or existing references]
`useRouter(read)` compares snapshots with `Object.is`. Return a primitive or an existing object reference like `r.pending` rather than building a fresh `{ ... }` literal inside the selector.
:::

## Per-view error isolation

In a plain React tree, an uncaught error during render unmounts the entire root. `@nav-router/react` wraps every rendered view and layout in its own error boundary:

- **Parent layouts stay standing.** If `MemberPage` throws while rendering, only that outlet renders `null` while `TeamLayout` and your site navigation stay interactive.
- **Errors report to `onError`.** The error and active route context are passed to `router.onError(error, context)`.
- **Navigation recovers automatically.** Clicking another link clears the failed state and renders the next route without a browser reload.
