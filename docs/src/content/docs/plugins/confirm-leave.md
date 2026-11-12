---
title: confirm-leave
kind: plugin
lede: "Prompts before leaving a page with unsaved edits across in-app navigation and tab close."
import: import '@nav-router/plugins/confirm-leave'
size: confirm-leave
updated: 2026-11-12
---

## Usage

Import `@nav-router/plugins/confirm-leave` before creating your router, then protect unsaved edits from inside a view with [`confirmLeave()`](#confirmleave) or on a route with [`canLeave`](#route-options):

```js for="core" label="app.js"
import '@nav-router/plugins/confirm-leave';
import { confirmLeave, router } from 'nav-router';

let dirty = false;

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'edit-post',
      path: '/posts/:id/edit',
      onCreated({ abortSignal }) {
        dirty = false;
        confirmLeave(
          () => (dirty ? 'Discard unsaved changes?' : true),
          { signal: abortSignal },
        );
      },
      view: () => '<form><textarea name="body"></textarea></form>',
    },
  ],
});

await app.start();
```

```jsx for="react" label="app.jsx"
import '@nav-router/plugins/confirm-leave';
import { confirmLeave, router } from '@nav-router/react';
import { useEffect, useState } from 'react';

function PostEditor() {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    return confirmLeave(() => 'Discard unsaved changes?');
  }, [dirty]);

  return (
    <form onChange={() => setDirty(true)}>
      <textarea name="body" />
    </form>
  );
}

const app = router({
  mount: '#app',
  routes: [{ name: 'edit-post', path: '/posts/:id/edit', view: PostEditor }],
});

await app.start();
```

```tsx for="solid" label="app.tsx"
import '@nav-router/plugins/confirm-leave';
import { confirmLeave, router } from '@nav-router/solid';
import { createSignal, onCleanup } from 'solid-js';

function PostEditor() {
  const [dirty, setDirty] = createSignal(false);
  const stop = confirmLeave(() => (dirty() ? 'Discard unsaved changes?' : true));
  onCleanup(stop);

  return (
    <form onInput={() => setDirty(true)}>
      <textarea name="body" />
    </form>
  );
}

const app = router({
  mount: '#app',
  routes: [{ name: 'edit-post', path: '/posts/:id/edit', view: PostEditor }],
});

await app.start();
```

Guards receive `from`, `destination`, `navigationType`, `event`, and `router` (plus `route` on `canLeave`) and can return:

- **`true` or `undefined`** — allow leaving without prompting.
- **A non-empty string** — pass the message to [`confirm`](#settings) (`window.confirm` by default) and cancel if declined.
- **`false`** — block navigation silently (or trigger the browser's prompt on tab close).
- **A `Promise`** resolving to any of the above — pauses link and history navigation until resolved.

:::note[Closing or reloading the tab]
Browsers require `beforeunload` checks to run synchronously and display their own dialog text. Return a string or `false` synchronously when work is unsaved, and use [`confirm`](#settings) if you want an async custom modal for in-app navigation.
:::

## Route options

Add `canLeave` to any [route](/api/route-options/) or section:

```params
- name: canLeave
  type: "boolean | string | ((context) => boolean | string | Promise<boolean | string>)"
  description: "Checked when leaving this route, when its `:params` or declared `query` keys change, or when leaving the document via external links, `rel=\"external\"`, or tab close."
```

`#hash` jumps and undeclared query changes on the same route do not trigger `canLeave`:

```js title="routes.js"
{
  name: 'draft',
  path: '/drafts/:id',
  canLeave: ({ destination }) => {
    if (!hasUnsavedDraft() || destination?.route?.name === 'draft-preview') {
      return true;
    }
    return 'Leave without saving this draft?';
  },
  view: DraftEditor,
}
```

## Methods

:::entry
### `confirmLeave()` :kind[method]

```js signature
const dispose = router.confirmLeave(guard, options?)
const dispose = confirmLeave(guard, options?)
```

Registers a leave guard until `dispose()` is called, `options.signal` aborts, or `router.stop()` runs. Also exported directly from `nav-router`, `@nav-router/react`, and `@nav-router/solid`.

**Parameters**

```params
- name: guard
  type: "(context) => boolean | string | Promise<boolean | string>"
  required: true
  description: Leave check called on link clicks, Back/Forward, external links, and tab close.
- name: options
  type: object
  default: "{}"
  description: Guard lifecycle options.
  options:
    - name: signal
      type: AbortSignal
      description: Unregisters the guard automatically when aborted.
```
:::

## Settings

Pass `confirm` to `router(options)` to replace `window.confirm` with your own dialog:

```params
- name: confirm
  type: "(message, context) => boolean | Promise<boolean>"
  default: "window.confirm"
  description: "Prompt handler called when a guard returns a non-empty string. Return `true` (or a Promise of `true`) to proceed."
```

```js title="app.js"
const app = router({
  confirm: (message) => openConfirmDialog({ title: 'Unsaved changes', message }),
  // ...routes
});
```
