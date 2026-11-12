---
title: Guards and redirects
lede: This guide covers how to redirect routes before they commit and protect pages with user permissions.
updated: 2026-11-12
---

## Redirecting routes

Add `redirect` to a route when an old URL has moved or a bare section path should land on a default child page. Pass a route name or path string (or a [`Route`](/api/route/) instance), or use a function when the target depends on URL parameters or the current user:

```js title="routes.js"
import { href } from 'nav-router';

const routes = [
  // Send '/settings' to its default child tab
  { path: '/settings', redirect: 'profile' },
  { name: 'profile', path: '/settings/profile', view: ProfileView },

  // Forward matching :params automatically to the target route
  { path: '/org/:org', redirect: 'team-members' },
  { name: 'team-members', path: '/teams/:org/members', view: MembersView },

  // Pick a destination dynamically (sync or async)
  {
    path: '/dashboard',
    redirect: ({ user }) =>
      user?.defaultOrg ? href('team-members', { org: user.defaultOrg }) : '/onboarding',
  },
];
```

- **Resolves before commit** — on link clicks and programmatic navigations, redirects run before the browser commits the URL. Intermediate URLs never enter session history, so Back skips straight past them.
- **Conditional redirects** — when a `redirect` function returns `null` or `undefined`, the router continues into the route normally instead of redirecting.
- **Carries matching `:params`** — redirecting to a named route forwards any path parameters declared on both routes (such as `:org` above). Call [`href()`](/api/router/#href) when you also need to build query parameters or rename keys.
- **Follows chains** — a redirect may point to another redirecting route (up to 5 hops) before settling on the final destination.

## Resolving the current user

Route guards and `data` functions read the active user from `router.user` and pass it on to your views. Set `user` when you already have the session synchronously at startup, or pass `identity` to resolve it before guards run:

```js title="app.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  async identity({ signal }) {
    const res = await fetch('/api/session', { signal });
    return res.ok ? res.json() : null;
  },
  routes,
});
```

When you manage sessions client-side without `identity`, assign `app.user` directly after signing in or out and navigate where the user should go next:

```js
// After sign-in succeeds:
app.user = signedInUser;
app.navigate(app.current?.query.returnTo ?? 'home');

// After sign-out:
app.user = null;
app.navigate('sign-in');
```

:::for[solid]
In `@nav-router/solid`, `app.user` is a reactive signal. Setting `app.user = null` re-runs active `permission` guards on the current page immediately, redirecting or showing `statusViews.forbidden` in place.
:::

## Protecting routes with `permission`

Add `permission` to any route or `section` to control access. Putting `permission` on a section protects every child route inside it and runs before any `data` loader in that branch:

```js for="core" label="routes.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  statusViews: {
    forbidden: ({ user }) => `
      <h1>Access denied</h1>
      <p>${user.name} does not have billing permissions.</p>
    `,
  },
  routes: [
    { name: 'sign-in', path: '/sign-in', view: SignInView },
    {
      path: '/teams/:org/settings',
      permission: ({ user }) => Boolean(user),
      layout: SettingsLayout,
      routes: [
        { name: 'general', path: '/teams/:org/settings/general', view: GeneralView },
        {
          name: 'billing',
          path: '/teams/:org/settings/billing',
          permission: ({ user }) => user?.role === 'admin',
          view: BillingView,
        },
      ],
    },
  ],
});
```

```jsx for="react" label="routes.jsx"
import { router } from '@nav-router/react';

function Forbidden({ user }) {
  return (
    <>
      <h1>Access denied</h1>
      <p>{user.name} does not have billing permissions.</p>
    </>
  );
}

const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  statusViews: { forbidden: Forbidden },
  routes: [
    { name: 'sign-in', path: '/sign-in', view: SignInView },
    {
      path: '/teams/:org/settings',
      permission: ({ user }) => Boolean(user),
      layout: SettingsLayout,
      routes: [
        { name: 'general', path: '/teams/:org/settings/general', view: GeneralView },
        {
          name: 'billing',
          path: '/teams/:org/settings/billing',
          permission: ({ user }) => user?.role === 'admin',
          view: BillingView,
        },
      ],
    },
  ],
});
```

```tsx for="solid" label="routes.tsx"
import { router } from '@nav-router/solid';

function Forbidden(props) {
  return (
    <>
      <h1>Access denied</h1>
      <p>{props.user.name} does not have billing permissions.</p>
    </>
  );
}

const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  statusViews: { forbidden: Forbidden },
  routes: [
    { name: 'sign-in', path: '/sign-in', view: SignInView },
    {
      path: '/teams/:org/settings',
      permission: ({ user }) => Boolean(user),
      layout: SettingsLayout,
      routes: [
        { name: 'general', path: '/teams/:org/settings/general', view: GeneralView },
        {
          name: 'billing',
          path: '/teams/:org/settings/billing',
          permission: ({ user }) => user?.role === 'admin',
          view: BillingView,
        },
      ],
    },
  ],
});
```

When a `permission` check returns a falsy value, the outcome depends on whether the user is signed in:

- **Signed out (`!router.user`) with `signInRoute` set** — redirects before commit to `signInRoute` with `?returnTo=` carrying the requested URL (such as `/sign-in?returnTo=%2Fbilling`).
- **Signed in without access** — stays on the requested URL, renders any parent layouts above the refusing route, and shows the nearest `statusViews.forbidden` (or redirects to `signInRoute` if no `forbidden` view is defined).

:::note
`query.returnTo` is automatically restricted to same-origin paths starting with `'/'`, so passing `query.returnTo` to `navigate()` after sign-in cannot redirect to an external site.
:::

## Hiding unauthorized links with `canAccess()`

Guarding a route blocks direct URL visits, while [`canAccess()`](/api/can-access/) lets your UI hide navigation links or buttons the current user cannot open:

```js
import { canAccess, href } from 'nav-router';

if (canAccess('billing', { org: 'acme' })) {
  // Show link to href('billing', { org: 'acme' })
}
```

`canAccess()` checks `permission` on the target route and every ancestor section above it:

- **Synchronous guards** return a `boolean` immediately, so you can call `canAccess()` directly inside templates and JSX conditionals.
- **Async guards** return a `Promise<boolean>` when any `permission` function in the chain returns a promise.

Try switching roles and testing `returnTo` redirects in the live [Guards and sign-in example](/examples/guards/).
