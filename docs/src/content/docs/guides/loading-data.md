---
title: Loading data
lede: This guide covers how to fetch data before a page renders and share it across nested layouts.
updated: 2026-11-12
---

## Page data

Before rendering a page, you often need to fetch data from an API. Add a `data` function to the route, and the object it returns is passed to your view as `data`:

```js for="core" label="routes.js"
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'post',
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      view: ({ data }) => `
        <article>
          <h1>${data.post.title}</h1>
          <div>${data.post.body}</div>
        </article>
      `,
    },
  ],
});

await app.start();
```

```jsx for="react" label="routes.jsx"
import { router } from '@nav-router/react';

function Post({ data }) {
  return (
    <article>
      <h1>{data.post.title}</h1>
      <div>{data.post.body}</div>
    </article>
  );
}

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'post',
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      view: Post,
    },
  ],
});

await app.start();
```

```tsx for="solid" label="routes.tsx"
import { router } from '@nav-router/solid';

function Post(props) {
  return (
    <article>
      <h1>{props.data.post.title}</h1>
      <div>{props.data.post.body}</div>
    </article>
  );
}

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'post',
      path: '/blog/:slug',
      async data({ params, signal }) {
        const res = await fetch(`/api/posts/${params.slug}`, { signal });
        return { post: await res.json() };
      },
      view: Post,
    },
  ],
});

await app.start();
```

`data` resolves before `Post` renders, so your view can read `data.post` directly without its own loading state or null checks. Fast responses swap cleanly once ready; slower loads can show a loading view (see [Loading states](/guides/loading-states/)).

:::tip[Reading props in Solid]{for="solid"}
`props` properties are reactive getters in `@nav-router/solid`. Read `props.data.post` inside JSX or reactive expressions rather than destructuring `props` at the top of the component.
:::

## Using URL parameters

Path segments and query parameters arrive on the `data` argument with any defaults and type conversions already applied:

```js title="routes.js"
{
  name: 'issues',
  path: '/projects/:org/issues',
  query: {
    status: { default: 'open', allowed: ['open', 'closed'] },
    page: { type: Number, default: 1 },
  },
  async data({ params, query, signal }) {
    const search = new URLSearchParams({ status: query.status, page: query.page });
    const res = await fetch(`/api/orgs/${params.org}/issues?${search}`, { signal });
    return { issues: await res.json() };
  },
}
```

Alongside `params` and `query`, the `data` argument includes:

- **`signal`** — `AbortSignal` tied to this navigation; pass it to `fetch()` so stale requests cancel automatically when a user clicks quickly through links
- **`user`** — the current user from `identity` or `router.user`
- **`data`** — data already loaded by parent routes
- **`notFound`** — renders `statusViews.notFound` when a record doesn't exist

## Layout data

When a section and its child pages need the same record, put `data` on the section. Its return value is available to the section's layout as well as every child route beneath it:

```js title="routes.js"
app.section({
  path: '/teams/:org',
  layout: ({ data }) => `
    <header>${data.team.name}</header>
    <main><slot></slot></main>
  `,
  async data({ params, signal }) {
    const res = await fetch(`/api/teams/${params.org}`, { signal });
    return { team: await res.json() };
  },
  routes: [
    {
      name: 'member',
      path: '/teams/:org/members/:id',
      async data({ params, data, signal }) {
        const res = await fetch(`/api/teams/${data.team.id}/members/${params.id}`, { signal });
        return { member: await res.json() };
      },
      view: ({ data }) => `<h1>${data.member.name} (${data.team.name})</h1>`,
    },
  ],
});
```

Here `member` reads `data.team` in both its `data` function and its view without fetching the team twice.

- If a child route returns the same key as a parent, the child's value wins for that route and anything below it.
- `data` can also be a plain object (such as `data: { fullWidth: true }`) for static route metadata.
- Merged data from every active route on the page is available on `router.page.data`.

## Avoiding waterfalls

Awaiting two independent requests one after the other forces the second to wait on the first. Return an object of promises instead so both start immediately in parallel:

```js title="routes.js"
{
  name: 'project',
  path: '/projects/:id',
  data({ params, signal }) {
    return {
      project: fetch(`/api/projects/${params.id}`, { signal }).then((r) => r.json()),
      activity: fetch(`/api/projects/${params.id}/activity`, { signal }).then((r) => r.json()),
    };
  },
}
```

Your view receives the resolved `project` and `activity` values once both finish.

:::note
Parent `data` finishes before child `data` starts so child routes can read parent values like `data.team.id`. To run unrelated parent and child requests in parallel, start both on the parent route.
:::

## When `data` re-runs

Navigating from `/teams/acme/members/1` to `/teams/acme/members/2` stays inside `/teams/acme`, so `/teams/:org` keeps its loaded `team` and only `member` re-runs.

An active route reuses its loaded data across navigations unless:

- A `:param` on that route (or a parent route) changes
- A `query` key declared on that route (or a parent route) changes
- `router.user` changes
- You call [`reload()`](/api/router/#reload)

Declare any query parameter your `data` function reads in `query` on that route so changes to it trigger a refresh without re-running parent layouts above it.

Back/Forward navigation restores data from the earlier visit instead of fetching again. After saving a form or mutating server state, call [`reload()`](/api/router/#reload) to refresh the current page:

```js
import { reload } from 'nav-router';

await updateMember(memberId, changes);
await reload().finished;
```

:::for[solid]
In `@nav-router/solid`, `data` runs inside a reactive computation rather than caching per history entry. Any Solid signal read inside `data` is tracked, and changing that signal re-runs `data` in place.
:::

## Missing pages and errors

A URL like `/blog/missing-post` still matches `/blog/:slug` until your API returns `404`. Return `notFound()` from `data` to render a not-found view instead:

```js title="routes.js"
{
  name: 'post',
  path: '/blog/:slug',
  async data({ params, signal, notFound }) {
    const res = await fetch(`/api/posts/${params.slug}`, { signal });
    if (res.status === 404) {
      return notFound();
    }
    if (!res.ok) {
      throw new Error(`Failed to load post (${res.status})`);
    }
    return { post: await res.json() };
  },
}
```

- **`notFound()`** renders the nearest `statusViews.notFound` inside any parent layouts that already loaded, keeping your site header and nav on screen.
- **Throwing an error** calls `onError` and renders the nearest `statusViews.error` in place of the page.

See [Loading states](/guides/loading-states/) to configure loading and error views.
