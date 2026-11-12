---
title: canAccess()
kind: function
lede: Evaluates a route's permission guards to decide whether to show or enable navigation links.
import: import { canAccess } from 'nav-router'
updated: 2026-11-12
---

:::entry
### `canAccess()` :kind[function]

```js signature
canAccess(target, args?)
```

Runs every `permission` guard from the root route down to `target` against the current `router.user` without navigating. Returns `true` when every guard allows entry (or when no `permission` guard is defined along the route).

- **Ancestor chain** — Checks parent section `permission` guards before the target route's own `permission`, matching the guard order used during navigation.
- **Permissions only** — Evaluates `permission` guards, not `redirect` rules.

**Parameters**

```params
- name: target
  type: "string | Route"
  required: true
  description: Route `name` or [`Route`](/api/route/) instance to test. Returns `false` if `target` does not match a registered route.
- name: args
  type: object
  default: "{}"
  description: Path parameters and query values passed to each `permission` guard (merged over any parameter `default` values on the route).
```

**Returns**

```returns
type: "boolean | Promise<boolean>"
description: Synchronous `boolean` when every `permission` guard along the route is synchronous; `Promise<boolean>` if any guard returns a promise.
```

**Example**

```js for="core" label="nav.js"
import { canAccess, href } from 'nav-router';

// Given a `billing` route with:
// permission: ({ user, params }) => user?.roles?.[params.org] === 'owner'
export function SettingsNav({ org }) {
  return `
    <nav>
      <a href="${href('profile', { org })}">Profile</a>
      ${canAccess('billing', { org })
        ? `<a href="${href('billing', { org })}">Billing</a>`
        : ''}
    </nav>
  `;
}
```

```jsx for="react" label="nav.jsx"
import { canAccess, href, useRouter } from '@nav-router/react';

// Given a `billing` route with:
// permission: ({ user, params }) => user?.roles?.[params.org] === 'owner'
export function SettingsNav({ org }) {
  const showBilling = useRouter(() => canAccess('billing', { org }));

  return (
    <nav>
      <a href={href('profile', { org })}>Profile</a>
      {showBilling && <a href={href('billing', { org })}>Billing</a>}
    </nav>
  );
}
```

```tsx for="solid" label="nav.tsx"
import { canAccess, href } from '@nav-router/solid';
import { Show } from 'solid-js';

// Given a `billing` route with:
// permission: ({ user, params }) => user?.roles?.[params.org] === 'owner'
export function SettingsNav(props: { org: string }) {
  return (
    <nav>
      <a href={href('profile', { org: props.org })}>Profile</a>
      <Show when={canAccess('billing', { org: props.org })}>
        <a href={href('billing', { org: props.org })}>Billing</a>
      </Show>
    </nav>
  );
}
```
:::

:::warning[Async permission guards]
If any `permission` guard on the route or its parents is `async`, `canAccess()` returns a `Promise<boolean>` — which is always truthy in an `if` check. Resolve the user asynchronously in [`identity`](/api/router/#settings) so `permission` guards remain synchronous for menu rendering.
:::
