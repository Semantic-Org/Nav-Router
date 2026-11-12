---
title: Route options
lede: Configures URL matching and page rendering for any route or section in your route tree.
updated: 2026-11-12
---

Pass these options when defining a node in [`router(options)`](/api/router/#router), `routes`, `index`, [`section()`](/api/route/#section), or [`route()`](/api/route/#route). On `router(options)`, any option below configures `router.root` alongside [router settings](/api/router/#settings).

## Identity and matching

```params
- name: name
  type: string
  description: "Unique name for [`navigate('name')`](/api/router/#navigate), [`href('name')`](/api/router/#href), [`isActive('name')`](/api/is-active/), and [`canAccess('name')`](/api/can-access/). When `routes` is passed as `{ [name]: options }`, each key sets `name` unless overridden."
- name: id
  type: string
  default: "name || path"
  description: Explicit route identifier (`${parent.id}:index` on unnamed index routes).
- name: path
  type: string
  default: "parent?.path ?? '/'"
  description: URL pattern starting with `'/'`. Supports `:param` segments, optional `:param?` segments, and a trailing `*` catch-all segment (`params['*']`). Nested child paths must start with their parent's `path` (such as `'/teams/:org/members/:id'`).
- name: params
  type: object
  default: "{}"
  description: Type coercion, defaults, and constraints for `:param` segments, inherited by child routes. Failed `allowed` or `validator` checks reject the route match so sibling routes can match instead.
- name: query
  type: object
  default: "{}"
  description: Type coercion, defaults, and constraints for URL search parameters, inherited by child routes. Invalid values fall back to `default`, `href()` omits values equal to `default`, and `Boolean` `true` formats as a bare flag (`?archived`). Changing a declared `query` key re-runs that route's `data`.
```

### Parameter and query specs

Each entry in `params` or `query` accepts a constructor (`Number`, `Boolean`, `Date`, `String`), a default value (`1`, `false`, `'open'`), or a spec object:

```params
- name: type
  type: "String | Number | Boolean | Date"
  description: Coerces URL strings before guards, `data`, and views run (also accepts `'string'`, `'number'`, `'boolean'`, or `'date'`). Inferred from `default` or `allowed[0]` when omitted.
- name: default
  type: "string | number | boolean | Date"
  description: Fallback when an optional `:param?` or query key is absent, or when a query value fails validation.
- name: allowed
  type: "Array<string | number | boolean | Date>"
  description: Whitelist of accepted values. Ranks above bare `:param` segments when multiple routes share a prefix.
- name: validator
  type: "(value) => boolean"
  description: Predicate called with the coerced value. Returning `false` skips a `:param` match or resets a `query` key to `default`.
```

```js title="routes.js"
{
  name: 'issues',
  path: '/projects/:org/issues/:number?',
  params: {
    number: Number,
  },
  query: {
    status: { default: 'open', allowed: ['open', 'closed'] },
    page: { type: Number, default: 1, validator: (n) => n >= 1 },
    archived: false,
  },
}
```

## Rendering and nesting

`view`, `layout`, `slots` entries, and `statusViews` entries accept a component or DOM view function, a [`lazy()`](/api/lazy/) thunk, a Promise, or a module with a `default` export.

```params
- name: view
  type: "Component | ((context) => Node | string) | Lazy"
  description: Page content rendered when this route is the active leaf. Receives `params`, `query`, `data`, `user`, `signal`, `route`, `router`, `activeRoutes`, and `page`.
- name: layout
  type: "Component | ((context) => Node | string) | Lazy"
  description: Persistent wrapper rendered while this route or any child route beneath it is active. Child views render into its default `<slot>` (or `children` in `@nav-router/react`).
- name: slots
  type: "Record<string, View | null | false>"
  description: Named views projected into `<slot name="...">` (or matching layout props in `@nav-router/react`) on ancestor layouts. Deeper active routes override ancestor slots; `null` or `false` restores the layout's fallback content.
- name: statusViews
  type: object
  description: Fallback views inherited down the route tree (nearest ancestor wins; set a key to `null` or `false` to clear an inherited fallback).
  options:
    - name: loading
      type: View
      description: Shown after `holdCommit` and `loadingDelay` while slow `data` loads, inside active ancestor layouts.
    - name: notFound
      type: View
      description: Shown when no route matches the URL or when `data` returns `notFound()`.
    - name: forbidden
      type: View
      description: Shown when `permission` returns `false` and `signInRoute` does not redirect.
    - name: error
      type: View
      description: Shown when `data` or view loading throws an uncaught error after URL commit.
- name: index
  type: RouteOptions
  description: Child leaf route matched when the URL equals this node's `path` (such as `'/'` on the root router or `'/teams/:org'` on a section).
- name: routes
  type: "RouteOptions[] | Record<string, RouteOptions>"
  description: Nested child routes and sections. An entry with `routes`, `index`, or `layout` (without `view` or `redirect`) is added as a section; all others are added as leaf routes.
- name: title
  type: "string | ((context) => string | null | Promise<string | null>)"
  description: Sets `page.title` and `document.title`. Functions run after `data` and receive `titles` (resolved ancestor titles, nearest first) alongside `params`, `query`, `data`, `user`, and `signal`.
```

## Data and guards

```params
- name: data
  type: "object | ((context) => object | Promise<object>)"
  description: Loads data top-down from root to leaf before rendering so child routes read parent values on `context.data`. Top-level promises on a returned object resolve in parallel; return `context.notFound()` to render `statusViews.notFound`. See [Loading data](/guides/loading-data/).
- name: redirect
  type: "string | Route | ((context) => string | Route | null | undefined | Promise<string | Route | null | undefined>)"
  description: Redirects to a route name, `Route`, or path before `permission` and `data` run, carrying over matching `:params` automatically. Returning `null` or `undefined` from a function lets navigation proceed to the route.
- name: permission
  type: "boolean | ((context) => boolean | Promise<boolean>)"
  description: Access guard evaluated top-down after `redirect` with `params`, `query`, `user`, `route`, `router`, and `signal`. Returning `false` redirects signed-out users to `signInRoute` (with `?returnTo=...`) or renders `statusViews.forbidden`.
```

## Lifecycle callbacks

Each callback receives `router`, `route`, `params`, `query`, `data`, `previous`, `abortSignal`, `abortController`, `timeout`, and `interval`.

```params
- name: onCreated
  type: "(context) => void"
  description: Called after the route enters the active page and mounts its views.
- name: onUpdated
  type: "(context) => void"
  description: Called when an already-active route updates because its params, declared query keys, `user`, `data`, or `reload()` changed.
- name: onDestroyed
  type: "(context) => void"
  description: Called in leaf-to-ancestor order right before the route unmounts its views and aborts `abortSignal`.
```

```js title="routes.js"
{
  name: 'deployments',
  path: '/projects/:org/deployments',
  onCreated({ router, interval }) {
    interval(() => router.reload(), 15_000);
  },
}
```

Any custom properties on a route options object (such as `meta` for [`@nav-router/plugins/head`](/plugins/head/) or app-defined menu metadata) are copied directly onto the [`Route`](/api/route/) instance.
