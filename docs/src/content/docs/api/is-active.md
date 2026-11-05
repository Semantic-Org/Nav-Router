---
title: isActive()
kind: function
lede: Whether a route is on the current page’s path. A section stays active while any page under it shows, which is what a menu needs to mark where you are.
import: import { isActive } from 'nav-router'
updated: 2026-11-05
---

## Signature

```js signature
isActive(target, args?): boolean
```

<p class="entry-label">Parameters</p>

```params
- name: target
  type: string | Route
  required: true
  description: A route name or a `Route`. A section’s name means the section, not its index page.
- name: args
  type: object
  default: 'null'
  description: Params and query the page must also have. Only the keys you pass are compared.
```

<p class="entry-label">Returns</p>

```returns
type: boolean
description: '`true` when the route is on the committed page’s path and every key in `args` matches.'
```

## Compared with `isCurrent()`

`isCurrent()` asks whether a route is the page itself. On `/team/acme/members`:

:::truth
| Call | `isActive` | `isCurrent` |
|---|---|---|
| `('team')` | true | false |
| `('members')` | true | true |
| `('team', { org: 'acme' })` | true | false |
| `('team', { org: 'globex' })` | false | false |
| `('settings')` | false | false |
:::

## Mark the current link

Set `aria-current` from it, so the active state is announced and you can style it from CSS.

```js for="core vue svelte semantic" label="nav.js"
import { href, isActive } from 'nav-router';

const link = (name, label) => `
  <a href="${href(name)}" ${isActive(name) ? 'aria-current="page"' : ''}>
    ${label}
  </a>`;
```

```jsx for="react preact" label="Nav.jsx"
import { href, isActive } from 'nav-router';

const NavLink = ({ name, children }) => (
  <a
    href={href(name)}
    aria-current={isActive(name) ? 'page' : undefined}
  >
    {children}
  </a>
);
```

```tsx for="solid" label="Nav.tsx"
import { href, isActive } from 'nav-router';

const NavLink = (props) => (
  <a
    href={href(props.name)}
    aria-current={isActive(props.name) ? 'page' : undefined}
  >
    {props.children}
  </a>
);
```

:::note[It reads the committed page]
During a navigation that hasn’t committed yet, `isActive()` still answers for the page on screen. To light the link being opened, read `router.pending`.
:::

## Related

- [`isCurrent()`](/api/is-current/): the page itself, not its sections.
- [`canAccess()`](/api/can-access/): whether the user may open a route, for hiding links.
- [`href()`](/api/router/#href): the URL for a route.
