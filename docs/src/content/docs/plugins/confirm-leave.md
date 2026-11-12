---
title: confirm-leave
kind: plugin
lede: Holds unsaved work on the page across link clicks, back and forward, and closing the tab, until the user says to go.
import: import '@nav-router/plugins/confirm-leave'
size: confirm-leave
updated: 2026-11-11
---

## Install

Import the plugin once. Nothing is asked until a route or a guard says there is something to lose.

```js title="app.js"
import '@nav-router/plugins/confirm-leave';
import { router } from 'nav-router';

const app = router({
  confirm: (message) => dialog.ask(message),
  // the routes
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `confirm` | `function` | `window.confirm` | Asks the user a message. Return `true` to go, or a promise of it, which is how a dialog of your own answers. |

## The `canLeave` route option

A route with `canLeave` is asked before a navigation leaves it.

```js
settings: {
  path: '/team/:org/settings',
  canLeave: () => (form.isDirty ? 'Discard your changes?' : true),
  view: SettingsPage,
},
```

| Return | Means |
|---|---|
| `false` | Stay. Nothing is shown. |
| A string | Ask the user, with the string as the message. |
| A promise of either | Wait for it. |
| Anything else | Go. |

Moving between the pages under a route is not leaving it. A change to one of its own params is, so going from one member to the next asks.

The function receives `{ from, destination, navigationType }`: the page being left, the match being opened (only its `url` when it is outside the app), and `'push'`, `'replace'`, `'traverse'`, `'reload'`, or `'unload'` when the tab is closing.

## Guard something that isn’t a route

:::entry
### `confirmLeave()` :kind[function]

```js signature
confirmLeave(guard, options?): function
```

Registers a guard that is asked on every navigation until you release it. Reach for it when the unsaved work belongs to an open editor or a dialog, not to a route. Also on the router, as `router.confirmLeave()`.

**Parameters**

```params
- name: guard
  type: function
  required: true
  description: Answers as `canLeave` does.
- name: options
  type: object
  default: '{}'
  options:
    - name: signal
      type: AbortSignal
      description: Releases the guard when it aborts.
```

**Returns**

```returns
type: function
description: Releases the guard.
```

**Example**

```js title="editor.js"
import { confirmLeave } from 'nav-router';

const release = confirmLeave(() => (editor.isDirty ? 'Discard this draft?' : true));

editor.onClose(release);
```
:::

## What it can and can’t hold

A refusal stops the navigation before the URL moves, links out of the app included. Where the browser can’t hold one, as with some back and forward presses, or a promise in a browser that commits the URL at once, the URL moves and is put back when the answer is no.

:::warning[Closing the tab asks in the browser’s words]
When the tab closes, the browser shows its own prompt, and only `false` or a string holds it there. A promise can’t keep a tab open, so a guard that must cover closing answers without one.
:::
