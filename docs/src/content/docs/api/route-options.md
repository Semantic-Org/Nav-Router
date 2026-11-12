---
title: Route options
lede: Every key a route declaration accepts — its path, typed params and query, views and slots, guards, data, titles, status views and lifecycle callbacks.
updated: 2026-11-11
---

## Declare a route

A route is a plain object inside `routes` or `index`, or passed to [`route.section()`](/api/route/#section), [`route.route()`](/api/route/#route) or [`route.index()`](/api/route/#index). On [`router(options)`](/api/router/), every key that is not a [router setting](/api/router/#settings) belongs to the root route.

```js for="core" label="routes.js"
import { lazy, router } from 'nav-router';

export const app = router({
  name: 'home',
  title: 'Acme',
  layout: RootLayout,
  statusViews: {
    loading: LoadingPage,
    notFound: NotFoundPage,
    forbidden: ForbiddenPage,
    error: ErrorPage,
  },
  index: { path: '/', view: HomePage },
  routes: {
    signIn: { path: '/sign-in', view: SignInPage },
    team: {
      path: '/team/:org',
      params: { org: 'acme' },
      layout: TeamLayout,
      slots: { sidebar: TeamSidebar },
      data: ({ params, signal }) => ({
        team: api.team(params.org, { signal }),
      }),
      title: ({ data }) => data.team.name,
      index: { view: MembersPage },
      routes: {
        member: {
          path: '/team/:org/:userId',
          query: { compact: false },
          data: async ({ params, data, signal, notFound }) => {
            const member = await api.member(data.team.id, params.userId, { signal });
            return member ? { member } : notFound();
          },
          title: ({ data, titles }) => [data.member.name, ...titles].join(' · '),
          view: MemberPage,
        },
        settings: {
          path: '/team/:org/settings',
          permission: ({ user }) => user?.role === 'admin',
          view: lazy(() => import('./settings-page.js')),
        },
      },
    },
  },
});
```

## All options

| Option | Type | Default | Description |
|---|---|---|---|
| [`path`](#path-and-matching) | `string` | `parent?.path ?? '/'` | Full URL path pattern for this route. |
| [`name`](#sections-index-and-child-routes) | `string` | Key in `routes` | Route name used by `navigate()`, `href()`, `isActive()`, `isCurrent()` and `canAccess()`. |
| [`id`](#sections-index-and-child-routes) | `string` | `name \|\| path` | Unique route identifier. |
| [`params`](#params-and-query) | `object` | `{}` | Types, defaults and allowed values for `:param` segments. |
| [`query`](#params-and-query) | `object` | `{}` | Types, defaults and allowed values for URL search params. |
| [`view`](#views-layouts-and-slots) | `View \| Promise \| lazy` | `undefined` | Page view shown when this route is the deepest active route. |
| [`layout`](#views-layouts-and-slots) | `View \| Promise \| lazy` | `undefined` | Frame rendered around this route and its children. |
| [`slots`](#views-layouts-and-slots) | `object` | `{}` | Views filling named `<slot name="…">` elements in a layout above. |
| [`index`](#sections-index-and-child-routes) | `object` | `undefined` | Page shown when a section’s own path is opened. |
| [`routes`](#sections-index-and-child-routes) | `object \| array` | `undefined` | Child sections and pages under this route. |
| [`redirect`](#redirect) | `string \| Route \| function` | `undefined` | Sends matching navigations to another route or URL. |
| [`permission`](#permission) | `boolean \| function` | `undefined` | Whether the current user may open this route. |
| [`data`](#data) | `object \| function` | `undefined` | Data loaded for this route and merged down to its children and views. |
| [`title`](#title) | `string \| function` | `undefined` | Title for this route, evaluated after its `data`. |
| [`statusViews`](#statusviews) | `object` | `undefined` | Views for `loading`, `notFound`, `forbidden` and `error`. |
| [`onCreated`](#lifecycle-callbacks) | `function` | `undefined` | Called when the route mounts on the page. |
| [`onUpdated`](#lifecycle-callbacks) | `function` | `undefined` | Called when the route stays mounted and its data or params update. |
| [`onDestroyed`](#lifecycle-callbacks) | `function` | `undefined` | Called when the route leaves the page. |
| `meta` | `object \| function` | `undefined` | `<meta>` and canonical tags in `document.head`. Added by [`head`](/plugins/head/). |
| `canLeave` | `boolean \| string \| function` | `undefined` | Prompt or blocker before leaving unsaved work. Added by [`confirm-leave`](/plugins/confirm-leave/). |

## Path and matching

Write each child route’s `path` in full from the root of the app, starting with its parent’s path:

```js
team: {
  path: '/team/:org',
  routes: {
    member: { path: '/team/:org/:userId', view: MemberPage },
    files: { path: '/team/:org/files/*', view: FilesPage },
  },
},
```

| Segment | Example | Matches |
|---|---|---|
| Static | `team`, `settings` | That exact segment. |
| Param | `:org`, `:userId` | One segment into `params[name]`. |
| Optional param | `:tab?`, or `:tab` with a `default` in `params` | Present, or omitted at the end of the URL. |
| Rest | `*` (last segment) | Zero or more remaining segments joined by `'/'` into `params['*']`. |

### Which route wins

When two leaf routes match the same URL, each segment is scored from left to right and the first segment where they differ picks the winner:

1. Static segment (`settings`)
2. Param with `allowed` (`allowed: ['overview', 'members']`)
3. Typed or validated param (`type: Number`, or `validator`)
4. Plain string param (`:userId`)
5. Rest segment (`*`) with one or more segments
6. Route already ended (an exact match beats a longer route whose trailing optional param or `*` was left empty)

When two routes tie at every segment, the one declared first wins.

## Params and query

Declare `params` and `query` to coerce URL strings into typed values, supply defaults, or restrict allowed values. A child route inherits every `params` and `query` rule from the sections above it.

| Form | Example | What it means |
|---|---|---|
| Type | `userId: String`, `page: Number`, `compact: Boolean`, `since: Date` | Coerce to that type, no default. |
| Default value | `org: 'acme'`, `page: 1`, `compact: false` | Coerce to the default’s type, and use the default when left out. |
| Spec object | `{ type, default, allowed, validator }` | Full spec: `allowed` is an array of permitted values; `validator` is `(value) => boolean`. |

- **`Boolean`** accepts `'true'`, `'1'`, `'yes'`, `'on'` (and a bare `?compact` in `query`) as `true`, and `'false'`, `'0'`, `'no'`, `'off'` as `false`.
- **`Number`** accepts finite numeric strings (`'42'`, `'-3.5'`).
- **`Date`** accepts ISO 8601 dates (`'2026-11-11'`).
- **Invalid values**: A `:param` that fails coercion, `allowed` or `validator` does not match the route. A `query` key that fails falls back to its `default`.

## Sections, `index` and child `routes`

A route in `routes` with `layout`, `routes` or `index` (and no `view` or `redirect`) is a **section**: its layout, slots and data stay mounted while the pages under it change.

Give a section `index` for the page shown at the section’s own path. It inherits the section’s `path` and `name` unless it sets its own, so `navigate('team', { org: 'acme' })` and `href('team', { org: 'acme' })` go to the section’s index page while [`isActive('team')`](/api/is-active/) stays `true` across the whole section.

## Views, layouts and slots

```js title="team-layout.js"
export const TeamLayout = ({ data }) => `
  <div class="team-shell">
    <h2>${data.team.name}</h2>
    <aside id="sidebar-scroll">
      <slot name="sidebar"><p>No sidebar</p></slot>
    </aside>
    <main>
      <slot></slot>
    </main>
  </div>`;
```

- **`layout`** wraps the route and its children. In the plain router, `<slot></slot>` is where child layouts and the page’s `view` go, and `<slot name="…"></slot>` is a named slot.
- **`view`** is the page shown by the deepest active route inside the nearest layout’s default `<slot></slot>`.
- **`slots`** maps slot names to views (`{ sidebar: TeamSidebar }`), filling the nearest `<slot name="…">` above. When a child route declares the same slot name, the child’s view takes over until you leave the child; setting a slot to `null` (`slots: { sidebar: null }`) clears the ancestor’s slot and shows the `<slot>` element’s fallback markup.

Every `view`, `layout`, `slots` entry and `statusViews` entry can be a view function or value, a component for your framework integration, a module/promise, or a [`lazy()`](/api/lazy/) loader.

## Guards, data, title and status views

### `redirect`

Sends a matching navigation to another route name, `Route` or URL before `permission` and `data` run. Any `params` the target route shares are carried over automatically.

```js
legacyTeam: {
  path: '/orgs/:org',
  redirect: 'team',
},
```

### `permission`

A boolean or `(context) => boolean | Promise<boolean>`, checked from root to leaf after the router’s `identity` setting updates `router.user`. The first route that returns falsy stops the walk:

1. When `signInRoute` is set on the router and no user is signed in, the router redirects to `signInRoute` with `returnTo` in the query.
2. Otherwise, the sections above the refusing route stay mounted with their layouts and data, and the nearest `statusViews.forbidden` renders in place of the route.

### `data`

An object or `(context) => object | Promise<object> | notFound()`, run from root to leaf after guards pass so each route reads the resolved `data` of the sections above it.

```js
member: {
  path: '/team/:org/:userId',
  data: async ({ params, data, signal, notFound }) => {
    const member = await api.member(data.team.id, params.userId, { signal });
    return member ? { member } : notFound();
  },
  view: MemberPage,
},
```

- Promise values inside a returned object (`{ team: fetchTeam(), stats: fetchStats() }`) are awaited in parallel.
- An active section keeps its loaded `data` across child navigations unless one of its own `params` or `query` keys changes, `router.user` changes, or [`reload()`](/api/router/#reload) is called. Back and forward (`traverse`) reuse the history entry’s result for the same user.
- Calling `notFound()` stops the walk, keeps the sections above mounted, and shows the nearest `statusViews.notFound`.

### `title`

A string or `(context) => string | Promise<string>`, run right after the route’s own `data` settles. `context.titles` holds the non-empty titles of the active sections above, nearest first:

```js
title: ({ data, titles }) => [data.member.name, ...titles].join(' · '),
```

The leaf’s resolved title is written to `router.page.title` and `document.title`.

### `statusViews`

Views shown while loading or when a route is not found, refused or throws:

```js
statusViews: {
  loading: LoadingPage,
  notFound: NotFoundPage,
  forbidden: ForbiddenPage,
  error: ErrorPage,
},
```

Each status view is looked up from the affected route up to the root, so a section can override `loading` or `notFound` for its pages while inheriting the rest from the root. Set a key to `null` (`statusViews: { loading: null }`) to turn that status view off for a route and its children.

## Lifecycle callbacks

```js
team: {
  path: '/team/:org',
  onCreated: ({ params, abortSignal, interval }) => {
    interval(() => pollTeam(params.org, { signal: abortSignal }), 30_000);
  },
  onUpdated: ({ params, previous }) => {
    logOrgSwitch(previous.params.org, params.org);
  },
  onDestroyed: ({ route }) => {
    cleanup(route.id);
  },
},
```

When a page settles, `onDestroyed` runs first (leaf to root) for routes leaving the page, then `onCreated` and `onUpdated` run (root to leaf) for routes entering or updating on the page. A section whose own `params` and `query` did not change stays as it is and does not fire `onUpdated`.

## What your functions receive

Every function on a route receives a single context object:

| Key | In `redirect` & `permission` | In `data` & `title` | In `view`, `layout` & `slots` | In `onCreated`, `onUpdated` & `onDestroyed` |
|---|---|---|---|---|
| `params`, `query` | Coerced URL values | Coerced URL values | Coerced URL values | Settling page’s values |
| `data` | `{}` | Ancestors’ data (`title` also includes this route’s `data`) | Merged data up to this route | Full page `data` |
| `user` | `router.user` | `router.user` | `router.user` | — |
| `route`, `router` | Current `Route` and `Router` | Current `Route` and `Router` | Current `Route` and `Router` | Current `Route` and `Router` |
| `signal` | Navigation `AbortSignal` | Navigation `AbortSignal` | Route `abortSignal` | `abortSignal` (`route.abortSignal`) |
| `activeRoutes` | `[]` | Settled entries above (`title` includes this route) | Active entries up to this route | — |
| Extra keys | — | `notFound()` in `data`; `titles` in `title` | `page` (`router.page`) | `previous`, `abortController`, [`timeout`](/api/route/#timeout), [`interval`](/api/route/#interval) |

## Related

- [`Route`](/api/route/): the `Route` instance and building routes with `.section()`, `.route()` and `.index()`.
- [`Router`](/api/router/): router settings (`holdCommit`, `loadingDelay`, `loadingMin`, `signInRoute`, `identity`).
- [Routes and params](/guides/routes-and-params/): guide to declaring routes and typed params.
