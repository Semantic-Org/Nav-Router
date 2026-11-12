---
title: Layouts and slots
lede: This guide covers how to share persistent layouts across routes and project content into named slots.
updated: 2026-11-12
---

## Root and nested layouts

Most apps keep a top navigation bar on every page while subsections add their own header or local navigation. Pass `layout` to [`router()`](/api/router/#router) for your outer app shell, and add `layout` to a `section` to wrap every route inside that branch:

```js for="core" label="routes.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  layout: () => `
    <header><a href="/">Home</a> · <a href="/teams/acme/members">Acme</a></header>
    <slot></slot>
  `,
  index: { view: () => '<h1>Home</h1>' },
  routes: [
    {
      path: '/teams/:org',
      layout: ({ params }) => `
        <div class="team-shell">
          <h2>Team ${params.org}</h2>
          <nav>
            <a href="/teams/${params.org}/members">Members</a>
            <a href="/teams/${params.org}/settings">Settings</a>
          </nav>
          <section><slot></slot></section>
        </div>
      `,
      routes: [
        { name: 'members', path: '/teams/:org/members', view: () => '<p>Member list</p>' },
        { name: 'settings', path: '/teams/:org/settings', view: () => '<p>Team settings</p>' },
      ],
    },
  ],
});

await app.start();
```

```jsx for="react" label="routes.jsx"
import { router } from '@nav-router/react';

function AppLayout({ children }) {
  return (
    <>
      <header><a href="/">Home</a> · <a href="/teams/acme/members">Acme</a></header>
      {children}
    </>
  );
}

function TeamLayout({ params, children }) {
  return (
    <div className="team-shell">
      <h2>Team {params.org}</h2>
      <nav>
        <a href={`/teams/${params.org}/members`}>Members</a>
        <a href={`/teams/${params.org}/settings`}>Settings</a>
      </nav>
      <section>{children}</section>
    </div>
  );
}

const app = router({
  mount: '#app',
  layout: AppLayout,
  index: { view: () => <h1>Home</h1> },
  routes: [
    {
      path: '/teams/:org',
      layout: TeamLayout,
      routes: [
        { name: 'members', path: '/teams/:org/members', view: () => <p>Member list</p> },
        { name: 'settings', path: '/teams/:org/settings', view: () => <p>Team settings</p> },
      ],
    },
  ],
});

await app.start();
```

```tsx for="solid" label="routes.tsx"
import { router } from '@nav-router/solid';

function AppLayout() {
  return (
    <>
      <header><a href="/">Home</a> · <a href="/teams/acme/members">Acme</a></header>
      <slot />
    </>
  );
}

function TeamLayout(props) {
  return (
    <div class="team-shell">
      <h2>Team {props.params.org}</h2>
      <nav>
        <a href={`/teams/${props.params.org}/members`}>Members</a>
        <a href={`/teams/${props.params.org}/settings`}>Settings</a>
      </nav>
      <section><slot /></section>
    </div>
  );
}

const app = router({
  mount: '#app',
  layout: AppLayout,
  index: { view: () => <h1>Home</h1> },
  routes: [
    {
      path: '/teams/:org',
      layout: TeamLayout,
      routes: [
        { name: 'members', path: '/teams/:org/members', view: () => <p>Member list</p> },
        { name: 'settings', path: '/teams/:org/settings', view: () => <p>Team settings</p> },
      ],
    },
  ],
});

await app.start();
```

Navigating from `/teams/acme/members` to `/teams/acme/settings` keeps both `AppLayout` and `TeamLayout` mounted in the DOM and swaps only the child page inside `TeamLayout`. Scroll position and local state in parent layouts stay intact.

Each view layer uses its own idiom for the default outlet:

- **Vanilla JS** renders child markup into an unnamed `<slot></slot>` element.
- **React** passes the rendered child view as the `children` prop, so React context providers in a layout wrap child pages directly.
- **Solid** renders child components into `<slot />` in JSX, while reactive `props` (`props.params`, `props.data`) update in place.

## Named slots

A child route sometimes needs to place UI outside the main content area, such as page-specific filters in a sidebar or action buttons in a top bar. Declare a named outlet in the layout, then pass `slots` on any route below it:

```js for="core" label="routes.js"
import { router } from 'nav-router';

const WorkspaceLayout = () => `
  <div class="workspace">
    <aside><slot name="sidebar"><p>All projects</p></slot></aside>
    <main><slot></slot></main>
  </div>
`;

const app = router({
  mount: '#app',
  routes: [
    {
      path: '/projects',
      layout: WorkspaceLayout,
      index: { view: () => '<h1>Projects</h1>' },
      routes: [
        {
          name: 'issues',
          path: '/projects/:id/issues',
          slots: {
            sidebar: ({ params }) => `<nav>Filters for ${params.id}</nav>`,
          },
          view: () => '<h1>Issues</h1>',
        },
      ],
    },
  ],
});
```

```jsx for="react" label="routes.jsx"
import { router } from '@nav-router/react';

function WorkspaceLayout({ sidebar, children }) {
  return (
    <div className="workspace">
      <aside>{sidebar ?? <p>All projects</p>}</aside>
      <main>{children}</main>
    </div>
  );
}

const app = router({
  mount: '#app',
  routes: [
    {
      path: '/projects',
      layout: WorkspaceLayout,
      index: { view: () => <h1>Projects</h1> },
      routes: [
        {
          name: 'issues',
          path: '/projects/:id/issues',
          slots: {
            sidebar: ({ params }) => <nav>Filters for {params.id}</nav>,
          },
          view: () => <h1>Issues</h1>,
        },
      ],
    },
  ],
});
```

```tsx for="solid" label="routes.tsx"
import { router } from '@nav-router/solid';

function WorkspaceLayout() {
  return (
    <div class="workspace">
      <aside><slot name="sidebar"><p>All projects</p></slot></aside>
      <main><slot /></main>
    </div>
  );
}

const app = router({
  mount: '#app',
  routes: [
    {
      path: '/projects',
      layout: WorkspaceLayout,
      index: { view: () => <h1>Projects</h1> },
      routes: [
        {
          name: 'issues',
          path: '/projects/:id/issues',
          slots: {
            sidebar: (props) => <nav>Filters for {props.params.id}</nav>,
          },
          view: () => <h1>Issues</h1>,
        },
      ],
    },
  ],
});
```

Named slots follow the active route hierarchy:

- **Child route context** — a parent `layout` only sees `data` from its own route and above, whereas a `slots` view declared on a child route receives that child route's `data` and `params`.
- **Section defaults and child overrides** — a section can set a default view with `slots: { sidebar: TeamNav }`, and any child route can override `slots.sidebar` while active. Leaving that child restores the section's slot view.
- **Clearing an inherited slot** — set `slots: { sidebar: null }` on a child route to empty a slot filled by a parent route.
- **Fallback content** — when no active route fills a slot, `<slot name="sidebar">` displays its inner fallback nodes. In React, the `sidebar` prop is `undefined`, so `{sidebar ?? <Fallback />}` renders your default.

:::for[react]
When a nested route fills a named slot across an intermediate layout above it, declare `slots: { sidebar: null }` (or a default view) on the ancestor route whose layout owns that prop so `@nav-router/react` attaches it to the right component.
:::

## Scoping status views to a layout

When a child page is loading, missing, forbidden, or throws an error, keeping surrounding navigation on screen gives users a way forward instead of a blank error screen.

Set app-wide `statusViews` on [`router()`](/api/router/#router), and override any of them on a section to tailor feedback for that part of your app:

```js title="routes.js"
app.section({
  path: '/teams/:org',
  layout: TeamLayout,
  data: loadTeam,
  statusViews: {
    loading: TeamLoadingSkeleton,
    notFound: MemberNotFoundView,
    forbidden: TeamUpgradePrompt,
    error: TeamErrorView,
  },
  routes: [
    {
      name: 'member',
      path: '/teams/:org/members/:id',
      data: loadMember,
      view: MemberView,
    },
  ],
});
```

- **Parent layouts stay visible** — if `loadMember` returns `notFound()` or a child route fails a `permission` check, `TeamLayout` and your root layout remain rendered with data from `loadTeam` while the status view appears inside the `TeamLayout` outlet.
- **Unmatched URLs keep the root shell** — visiting a URL that matches no route at all still renders your root `layout` with root `statusViews.notFound` inside it.
- **Inherited down the tree** — child routes inherit `statusViews` from their ancestors, so sections only need to specify the keys they customize. See [Loading states and errors](/guides/loading-states/) for loading timing and error recovery.
