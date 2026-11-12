---
title: '@nav-router/svelte'
lede: The Svelte integration. Route views are Svelte components, and the router’s state is Svelte state, so a view updates only where it read something that moved.
import: import { svelteRouter } from '@nav-router/svelte'
updated: 2026-11-10
---

## Exports

Everything `nav-router` exports, and three of its own:

| Export | What it is |
|---|---|
| `svelteRouter()` | Makes a `SvelteRouter`. Also exported as `router`, so a routes file reads the same in every framework. |
| `SvelteRouter` | The router class for Svelte. Takes the same options as [`Router`](/api/router/). |
| `Slot` | The component a layout uses to say where the views below it go. |

## Peer dependencies

`nav-router`, and `svelte` 5 or later. The package ships as source that uses runes, so the app’s build needs Svelte’s compiler, which a Vite app has from `@sveltejs/vite-plugin-svelte`.

## How views are rendered

A view is a Svelte component. It gets the route as props:

| Prop | What it holds |
|---|---|
| `params` | The page’s params, typed. |
| `query` | The page’s query, typed. |
| `data` | The data of the view’s route and the routes above it, merged. |
| `user` | Who the router’s `identity` returned. |
| `page` | The page as the router holds it: its url, titles, status and error. |
| `router`, `route` | The router and the view’s own route. |

Each prop is read live. A view that reads `params.org` runs again when `org` moves and is left alone when another param does. A layout that stays mounted across a navigation is not made again: what it read updates in place.

```svelte
<script>
  let { params, data } = $props();
</script>

<h2>{data.team.name}</h2>
<p>{params.org}</p>
```

:::note[A function of the router is live too]
`isActive()`, `isCurrent()` and the router’s `current`, `page`, `pending` and `user` are Svelte state under this integration. Read one in a component or a `$derived` and it follows every navigation.
:::

## `Slot`

A layout says where the views below it go with `Slot`. With no name it is where the layout’s pages go. With a name it is filled by the view a route declares under `slots`. Its children are what shows while nothing fills it.

```svelte
<script>
  import { Slot } from '@nav-router/svelte';
</script>

<aside>
  <Slot name="sidebar">
    <p>No sidebar on this page.</p>
  </Slot>
</aside>
<main>
  <Slot />
</main>
```

:::warning[A `<slot>` tag does not work in a Svelte layout]
The router looks for a `<slot>` element in the layout. Svelte compiles a `<slot>` tag away as its own legacy slot, so the element never reaches the page. `Slot` writes the element for you.
:::

## Data that reads state

A route’s `data`, `permission`, `title` or `redirect` that reads Svelte state runs again when that state moves, and the page follows without a navigation.

```js label="routes.js"
import { router } from '@nav-router/svelte';

import { store } from './store.svelte.js';

export const app = router({
  routes: {
    team: {
      path: '/team/:org',
      data: ({ params }) => ({ members: store.members.filter((member) => member.org === params.org) }),
      view: TeamPage,
    },
  },
});
```

## Context

Each view is mounted as its own root, so a context set in a layout does not reach the pages in its slots. Share state between routes and views in a module, as `$state` in a `.svelte.js` file.
