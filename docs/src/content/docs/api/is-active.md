---
title: isActive()
kind: function
lede: Checks whether a route matches the committed URL or one of its active parent sections.
import: import { isActive, isCurrent } from 'nav-router'
updated: 2026-11-12
---

:::entry
### `isActive()` :kind[function]

```js signature
isActive(target, args?)
```

Returns `true` when `target` is anywhere in the committed URL's active route chain — either the leaf page itself or a parent section wrapping it. Use `isActive()` for top-level or section links that stay highlighted while browsing child pages.

**Parameters**

```params
- name: target
  type: "string | Route"
  required: true
  description: Route `name` or [`Route`](/api/route/) instance. Pass a named route or `Route` object rather than a URL path string.
- name: args
  type: "object | null"
  default: "null"
  description: Subset of path parameters or query values that must match `router.current`. Keys omitted from `args` are ignored.
```

**Returns**

```returns
type: boolean
description: "`true` when `target` is active on `router.current` and every key in `args` matches."
```
:::

:::entry
### `isCurrent()` :kind[function]

```js signature
isCurrent(target, args?)
```

Returns `true` only when `target` is the exact leaf route for the committed URL (if `target` names a section with an `index` route, checks that index route). Use `isCurrent()` for `aria-current="page"` or sub-navigation links that should not highlight on deeper child routes.

Accepts the same `target` and `args` arguments as [`isActive()`](#isactive).
:::

## Comparing `isActive()` and `isCurrent()`

Given a `team` section (`path: '/teams/:org'`, with an `index` page) and a nested `members` route (`path: '/teams/:org/members'`), here is what each helper returns when the committed URL is `/teams/acme/members`:

:::truth
| Target | `args` | `isActive` | `isCurrent` |
| --- | --- | --- | --- |
| `'team'` | — | true | false |
| `'team'` | `{ org: 'acme' }` | true | false |
| `'team'` | `{ org: 'globex' }` | false | false |
| `'members'` | — | true | true |
| `'members'` | `{ org: 'acme' }` | true | true |
| `'members'` | `{ org: 'globex' }` | false | false |
:::

## Highlighting navigation links

Both helpers read `router.current`, so active states update as soon as a URL commits — even while slow `data` is still loading.

```js for="core" label="nav.js"
import { href, isActive, isCurrent } from 'nav-router';

export function TeamNav({ org }) {
  return `
    <nav>
      <a
        href="${href('team', { org })}"
        class="${isActive('team', { org }) ? 'active' : ''}"
        ${isCurrent('team', { org }) ? 'aria-current="page"' : ''}
      >
        Overview
      </a>
      <a
        href="${href('members', { org })}"
        ${isCurrent('members', { org }) ? 'aria-current="page"' : ''}
      >
        Members
      </a>
    </nav>
  `;
}
```

```jsx for="react" label="nav.jsx"
import { href, isActive, isCurrent, useRouter } from '@nav-router/react';

export function TeamNav({ org }) {
  const inTeam = useRouter(() => isActive('team', { org }));
  const onOverview = useRouter(() => isCurrent('team', { org }));
  const onMembers = useRouter(() => isCurrent('members', { org }));

  return (
    <nav>
      <a
        href={href('team', { org })}
        className={inTeam ? 'active' : undefined}
        aria-current={onOverview ? 'page' : undefined}
      >
        Overview
      </a>
      <a
        href={href('members', { org })}
        aria-current={onMembers ? 'page' : undefined}
      >
        Members
      </a>
    </nav>
  );
}
```

```tsx for="solid" label="nav.tsx"
import { href, isActive, isCurrent } from '@nav-router/solid';

export function TeamNav(props: { org: string }) {
  return (
    <nav>
      <a
        href={href('team', { org: props.org })}
        classList={{ active: isActive('team', { org: props.org }) }}
        aria-current={isCurrent('team', { org: props.org }) ? 'page' : undefined}
      >
        Overview
      </a>
      <a
        href={href('members', { org: props.org })}
        aria-current={isCurrent('members', { org: props.org }) ? 'page' : undefined}
      >
        Members
      </a>
    </nav>
  );
}
```

:::for[react]
Persistent React layouts do not re-render when child routes change inside their slots. Wrap `isActive()` and `isCurrent()` in [`useRouter()`](/api/react/#userouter) so links subscribe to URL updates.
:::

:::for[solid]
In `@nav-router/solid`, `router.current` is backed by a Solid signal, so calling `isActive()` or `isCurrent()` inside JSX updates the link automatically on navigation.
:::
