---
title: update()
kind: function
lede: Merges parameter or query changes into the current URL without resetting scroll or focus.
import: import { update } from 'nav-router'
updated: 2026-11-12
---

:::entry
### `update()` :kind[function]

```js signature
update(args?, options?)
```

Navigates to the current route with `args` merged into the active `params` and `query`, replacing the current history entry while keeping scroll position and focus in place.

- **Remove a key** — Pass `undefined` for any key to delete it from the merged parameters (or reset a declared parameter to its `default`). Query values set to `null` or equal to their `default` are also omitted from the URL.
- **Always in-place** — Runs with `history: 'replace'`, `resetScroll: false`, and `resetFocus: false` so filter inputs and tab controls keep the user's place. To push a new history entry instead, call [`navigate()`](/api/router/#navigate) with `keepQuery: true`.

**Parameters**

```params
- name: args
  type: object
  default: "{}"
  description: Path parameters and query values to merge into the current route. Set a key to `undefined` to remove it.
- name: options
  type: object
  default: "{}"
  description: Optional navigation metadata forwarded to [`navigate()`](/api/router/#navigate).
  options:
    - name: state
      type: unknown
      description: Structured-cloneable history entry state (preserves existing entry state when omitted).
    - name: info
      type: unknown
      description: Ephemeral value passed on `NavigateEvent.info` for this navigation.
    - name: hash
      type: string
      description: URL fragment (without `#`).
    - name: absolute
      type: boolean
      default: "false"
      description: Prepends `location.origin`.
```

**Returns**

```returns
type: "{ committed: Promise<void>, finished: Promise<void> }"
description: Promises that resolve when the URL commits and when route `data` finishes loading.
```

**Example**

```js title="filters.js"
import { update } from 'nav-router';

// Filter by search text and reset pagination to page 1
function onSearchInput(text) {
  update({
    q: text || undefined,
    page: undefined,
  });
}

// Switch active tab on a `:tab?` or `?tab=` route
function onTabSelect(tab) {
  update({ tab });
}

// Step to a specific page while keeping active filters
function onPageChange(page) {
  update({ page });
}
```
:::
