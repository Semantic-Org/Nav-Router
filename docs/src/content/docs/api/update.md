---
title: update()
kind: function
lede: Changes params or query on the current route in place, replacing the history entry without resetting scroll or focus.
import: import { update } from 'nav-router'
updated: 2026-11-11
---

## Signature

```js signature
update(args?, options?): { committed, finished }
```

<p class="entry-label">Parameters</p>

```params
- name: args
  type: object
  default: '{}'
  description: Params and query merged over the current page’s `params` and `query`. Pass `undefined` for a key to remove it.
- name: options
  type: object
  default: '{}'
  description: Any option of [`navigate()`](/api/router/#navigate) except `history`, `resetScroll` and `resetFocus`, which are fixed to `'replace'`, `false` and `false`.
```

<p class="entry-label">Returns</p>

```returns
type: '{ committed: Promise, finished: Promise }'
description: The Navigation API’s two promises, as in [`navigate()`](/api/router/#navigate).
```

## Filter or toggle in place

Use `update()` for controls that refine the current page — a filter input, a sort menu or a view toggle — where each change updates the URL without pushing a history entry or stealing scroll and focus from the control.

```js title="routes.js"
members: {
  path: '/team/:org/members',
  query: {
    compact: false,
    q: '',
  },
  view: MembersPage,
},
```

```js for="core" label="members.js"
import { update } from 'nav-router';

// toggle ?compact on and off
export const toggleCompact = (compact) => {
  update({ compact: !compact });
};

// update ?q= as the user types, or clear it
export const filterMembers = (value) => {
  update({ q: value || undefined });
};
```

## Related

- [`navigate()`](/api/router/#navigate): full navigation with history push and scroll/focus reset.
- [Routes and params](/guides/routes-and-params/#query-works-the-same-way): declaring typed `params` and `query` with defaults.
- [Query params](/examples/query-params/): `update()` toggling a query flag in the playground.
