---
title: Routes and params
lede: This guide covers path patterns, nested route sections, typed URL and query parameters, and match priority.
updated: 2026-11-12
---

## Path patterns

Route paths start with `/` and match slash-separated URL segments (trailing slashes are normalized automatically):

```js title="routes.js"
routes: {
  pricing: { path: '/pricing', view: Pricing },
  post: { path: '/blog/:slug', view: Post },
  archive: { path: '/blog/archive/:year?', view: Archive },
  files: { path: '/files/*', view: FileViewer },
}
```

- **Static segments** (`/pricing`) match that exact segment text.
- **Dynamic `:param` segments** (`/blog/:slug`) match any single segment, decode URI escapes, and pass the value on `params.slug`.
- **Optional `:param?` segments** (`/blog/archive/:year?`) match whether present or omitted (including multiple trailing `:param?` segments). When omitted, `params.year` is `undefined` unless a `default` is declared, and [`href()`](/api/router/#href) leaves trailing unset optional segments out of the URL.
- **Trailing wildcard `*`** (`/files/*`) appears only as the final segment and captures zero or more remaining segments joined by `'/'` on `params['*']` (`'docs/setup.md'` at `/files/docs/setup.md`, or `''` at `/files`).

## Grouping routes and index pages

`routes` accepts either an object `{ [name]: options }` (where each key sets the route's `name`) or an array of route objects.

To share a layout, access guard, `data` loader, or parameter spec across related pages, nest child routes under `routes` or call [`section()`](/api/router/#section). Add an `index` route when the section's own URL should also render a page:

```js title="routes.js"
routes: {
  team: {
    path: '/teams/:org',
    layout: TeamLayout,
    index: {
      view: TeamOverview,
    },
    routes: {
      members: {
        path: '/teams/:org/members',
        view: TeamMembers,
      },
      member: {
        path: '/teams/:org/members/:id',
        view: MemberDetail,
      },
    },
  },
}
```

- **Full child paths** — child routes always write their complete path starting with the parent's `path` (`'/teams/:org/members/:id'`, not `'members/:id'`). Every URL in your app stays greppable from a single string without piecing parent prefixes together, and `Route` throws an error if a child path omits its parent prefix.
- **`index` routes** — a section with child `routes` is not a leaf page on its own. Defining `index` renders `TeamOverview` at `/teams/:org` inside `TeamLayout`, and `href('team', { org: 'acme' })` links directly to `'/teams/acme'`.
- **Imperative routes** — you can also register routes imperatively with [`route()`](/api/router/#route) and [`section()`](/api/router/#section), or define the `'/'` page with [`index()`](/api/router/#index).

## Typed params and query specs

URL segments and query strings start as raw text. Declare `params` and `query` on a route to coerce values and apply defaults before your route hooks and views read them:

```js title="routes.js"
{
  name: 'issues',
  path: '/projects/:projectId/issues',
  params: {
    projectId: Number,
  },
  query: {
    status: { default: 'open', allowed: ['open', 'closed', 'all'] },
    page: { type: Number, default: 1, validator: (n) => Number.isInteger(n) && n >= 1 },
    archived: false,
    since: Date,
  },
  view: IssuesList,
}
```

Each key in `params` or `query` accepts any of these forms:

- **Type constructor** — `String`, `Number`, `Boolean`, or `Date` converts the raw value (`'42'` becomes `42`; ISO-8601 dates become `Date` instances).
- **Default shorthand** — passing a literal value such as `archived: false` or `page: 1` sets `default` and infers its type automatically.
- **Spec object** — an object with `type`, `default`, `allowed`, and `validator(value)`. When `type` is omitted, it is inferred from `default` or `allowed[0]`.

Child routes inherit `params` and `query` specs from their parent sections. Boolean query parameters accept bare flags (`?archived` parses as `true`), and [`href()`](/api/router/#href) omits query values equal to their `default` so URLs stay clean. Undeclared query keys in the URL still pass through on `query` as strings — try it live in the [Query params](/examples/query-params/) example.

:::note[Invalid params vs. invalid query values]
A `:param` that fails conversion or validation **rejects the route match** so a fallback route or `notFound` view can handle the URL. A `query` value that fails those checks keeps the route matched and **falls back to `default`** (`undefined` when no default is set).
:::

## Match priority

When multiple routes could match a URL, candidates are compared segment by segment from left to right rather than by registration order. At the first segment where two routes differ, the more specific segment wins:

1. **Static segment** (`/teams/new`)
2. **`allowed` parameter** (`:tab` with `allowed: ['members', 'billing']`)
3. **Typed or validated parameter** (`:id` with `Number` or `validator`)
4. **Plain `:param` segment** (`:slug`)
5. **Wildcard `*`** (`/files/*`), with an omitted `:param?` or empty `*` ranking last

Because constrained parameters outrank plain `:param` segments, sibling routes can share the same path depth cleanly:

```js title="routes.js"
routes: {
  createTeam: { path: '/teams/new', view: CreateTeam },
  teamById: { path: '/teams/:id', params: { id: Number }, view: TeamById },
  teamBySlug: { path: '/teams/:slug', view: TeamBySlug },
}
```

Here `/teams/new` matches `createTeam`, `/teams/42` matches `teamById` with `params.id` set to `42`, and `/teams/acme` skips `teamById` to match `teamBySlug`. When two routes have identical specificity at every segment, the route registered first wins.

Continue to [Loading data](/guides/loading-data/) to fetch records using parsed `params` and `query`.
