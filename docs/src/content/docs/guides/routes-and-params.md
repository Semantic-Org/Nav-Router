---
title: Routes and params
lede: Declare your routes as one tree, give the dynamic parts of a path a type, and link by name so a path can change without breaking a link.
updated: 2026-11-05
---

## Declare the tree

Each route has a name, which is its key, and a path. A route with `routes` of its own is a section: its layout and data stay mounted while the pages under it change.

```js for="core vue svelte semantic" label="routes.js" {10}
import { router } from 'nav-router';

export const app = router({
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        member: { path: '/team/:org/:userId', view: MemberPage },
      },
    },
  },
});
```

```jsx for="react preact" label="routes.jsx" {10}
import { router } from '@nav-router/react';

export const app = router({
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        member: { path: '/team/:org/:userId', view: MemberPage },
      },
    },
  },
});
```

```tsx for="solid" label="routes.tsx" {10}
import { router } from '@nav-router/solid';

export const app = router({
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      routes: {
        member: { path: '/team/:org/:userId', view: MemberPage },
      },
    },
  },
});
```

:::note[Child paths are written in full]
A child route repeats its parent’s path, as `'/team/:org/:userId'` does. You can read any route’s URL without walking up the tree.
:::

## Type the params

A `:name` in a path is a param. Declare it under `params` to give it a type, a default, or a fixed set of values. Your views only ever see values that passed.

| Declaration | Means |
|---|---|
| `userId: String` | Any string. |
| `org: 'acme'` | A string, `'acme'` when the URL leaves it out. |
| `tab: { default: 'overview' }` | The same, written out. |
| `tab: { allowed: ['overview', 'members'] }` | Only these values match the route. |

### Query works the same way

Declare `query` keys the same way. A value is read as the type of its default, so `compact: false` arrives in your view as a boolean, not the string `'false'`.

```js
member: {
  path: '/team/:org/:userId',
  query: {
    compact: false,
    section: { default: 'profile', allowed: ['profile', 'commits'] },
  },
},
```

## Add a page in three steps

:::steps
1. **Declare the route**

   Give it a name and a path, and the view it shows.

   ```js
   settings: { path: '/team/:org/settings', view: SettingsPage },
   ```

2. **Link to it by name**

   `href()` builds the URL, so the link is a plain anchor the browser already knows how to follow.

   ```js
   const link = `<a href="${href('settings', { org })}">Settings</a>`;
   ```

3. **Read its params in the view**

   The view receives the matched `params` and `query`, already typed.
:::

:::tip[Rename a path without touching a link]
Links name the route, not the path. Change `'/team/:org/settings'` to `'/org/:org/settings'` and every `href('settings')` follows.
:::

## Next

- [Layouts and slots](/guides/layouts-and-slots/): what a section keeps mounted.
- [Loading data](/guides/loading-data/): data per route, and what back and forward reuse.
- [`navigate()` reference](/api/router/#navigate): every option.
