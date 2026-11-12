---
title: isCurrent()
kind: function
lede: Whether a route is the current page itself, not a section above it.
import: import { isCurrent } from 'nav-router'
updated: 2026-11-11
---

## Signature

```js signature
isCurrent(target, args?): boolean
```

<p class="entry-label">Parameters</p>

```params
- name: target
  type: string | Route
  required: true
  description: A route name or a `Route`. A section’s name means its index page.
- name: args
  type: object
  default: 'null'
  description: Params and query the current page must also have. Only the keys you pass are compared.
```

<p class="entry-label">Returns</p>

```returns
type: boolean
description: '`true` when `target` is the committed page’s route and every key in `args` matches.'
```

## Compared with `isActive()`

[`isActive()`](/api/is-active/) stays `true` for a section while any page under it is open. `isCurrent()` is `true` only on the page itself. On `/team/acme/ada`:

:::truth
| Call | `isCurrent` | `isActive` |
|---|---|---|
| `('team')` | false | true |
| `('member')` | true | true |
| `('member', { userId: 'ada' })` | true | true |
| `('member', { userId: 'mo' })` | false | false |
| `('settings')` | false | false |
:::

## Mark one item in a list

When several links share a route with different params, pass those params in `args`:

```js for="core" label="sidebar.js"
import { href, isCurrent } from 'nav-router';

export const MemberList = ({ params, members }) => `
  <ul>
    ${members.map((m) => `
      <li>
        <a
          href="${href('member', { org: params.org, userId: m.id })}"
          ${isCurrent('member', { org: params.org, userId: m.id }) ? 'aria-current="page"' : ''}
        >
          ${m.name}
        </a>
      </li>`).join('')}
  </ul>`;
```

## Related

- [`isActive()`](/api/is-active/): whether a route or section is on the current page’s path.
- [`canAccess()`](/api/can-access/): whether the user may open a route.
- [`href()`](/api/router/#href): the URL for a route.
