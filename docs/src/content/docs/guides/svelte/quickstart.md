---
title: Svelte quickstart
lede: A Svelte app on nav-router, from install to a routed page, with views written as Svelte components.
import: import { svelteRouter } from '@nav-router/svelte'
updated: 2026-11-10
---

## Install

Install `nav-router`, `@nav-router/svelte` and `svelte`, with Svelte’s compiler in the build.

```sh
npm install nav-router @nav-router/svelte svelte
npm install -D vite @sveltejs/vite-plugin-svelte
```

```js label="vite.config.js"
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: [svelte()] });
```

## Create the router

`router()` from `@nav-router/svelte` in place of the core’s: the same routes, with Svelte components as views.

```js label="routes.js"
import { router } from '@nav-router/svelte';

import HomePage from './home-page.svelte';
import MemberPage from './member-page.svelte';
import TeamLayout from './team-layout.svelte';

export const app = router({
  mount: '#app',
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

app.start();
```

## A view reads the route

A view gets the route as props: `params`, `query` and `data`, live as the router moves.

```svelte label="member-page.svelte"
<script>
  let { params } = $props();
</script>

<h1>{params.userId} of {params.org}</h1>
```

## Layouts and slots

A layout is a component that stays mounted while the pages under it change. It says where they go with `Slot`.

```svelte label="team-layout.svelte"
<script>
  import { Slot } from '@nav-router/svelte';

  let { params } = $props();
</script>

<h2>Team {params.org}</h2>
<Slot />
```

:::note[Context stops at a slot]
Each view is mounted as its own root, so a context set in a layout does not reach the pages in its slot. Keep shared state in a module.
:::

## Next

- [`@nav-router/svelte` reference](/api/svelte/): the exports, the props a view gets, and `Slot`.
- [Routes and params](/guides/routes-and-params/): the route tree and typed params.
