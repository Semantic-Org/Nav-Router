---
title: canAccess()
kind: function
lede: Whether the current user may open a route. Runs the route’s `permission` guards from the root down, so a menu can hide links the router would refuse.
import: import { canAccess } from 'nav-router'
updated: 2026-11-11
---

## Signature

```js signature
canAccess(target, args?): boolean | Promise<boolean>
```

<p class="entry-label">Parameters</p>

```params
- name: target
  type: string | Route
  required: true
  description: A route name or a `Route`. A section’s name means its index page.
- name: args
  type: object
  default: '{}'
  description: Params and query passed to each `permission` function. Declared param defaults are filled in when left out.
```

<p class="entry-label">Returns</p>

```returns
type: boolean | Promise<boolean>
description: '`true` when every `permission` guard from the root down to the route passes for `router.user`. Returns a boolean when every guard is synchronous, or a promise when any guard is async.'
```

## Hide links the user cannot open

A `permission` guard on a section covers every route under it, and a route with no `permission` on itself or its sections returns `true`.

```js title="routes.js"
team: {
  path: '/team/:org',
  layout: TeamLayout,
  routes: {
    members: { path: '/team/:org/members', view: MembersPage },
    settings: {
      path: '/team/:org/settings',
      permission: ({ user }) => user?.role === 'admin',
      view: SettingsPage,
    },
  },
},
```

```js for="core" label="nav.js"
import { canAccess, href } from 'nav-router';

export const TeamNav = ({ params }) => `
  <nav>
    <a href="${href('members', { org: params.org })}">Members</a>
    ${canAccess('settings', { org: params.org })
      ? `<a href="${href('settings', { org: params.org })}">Settings</a>`
      : ''}
  </nav>`;
```

:::note[Sync menus need sync guards]
A menu that renders synchronously can’t wait for a promise. Load the user in the router’s `identity` setting so `permission` can read `user` synchronously.
:::

## Related

- [Route options](/api/route-options/): declaring `permission` on a route or section.
- [`isActive()`](/api/is-active/): whether a route is on the current page’s path.
- [`href()`](/api/router/#href): the URL for a route.
- [Guards and sign-in](/examples/guards/): `permission` and `signInRoute` in the playground.
