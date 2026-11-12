---
title: view-transitions
kind: plugin
lede: Crosses each page change inside `document.startViewTransition()`, so what leaves animates out and what appears animates in.
import: import '@nav-router/plugins/view-transitions'
size: view-transitions
updated: 2026-11-11
---

## Install

Import the plugin once. Each navigation’s DOM swap runs inside `document.startViewTransition()` where the browser supports it.

```js title="app.js"
import '@nav-router/plugins/view-transitions';
import { router } from 'nav-router';

const app = router({
  viewTransitions: {
    waitFor: 'finished',
  },
  // the routes
});
```

## Options

Pass an object under `viewTransitions` on [`router()`](/api/router/#settings).

| Option | Type | Default | Description |
|---|---|---|---|
| `waitFor` | `'finished' \| 'updateCallbackDone'` | `'finished'` | When the navigation settles: `'finished'` waits for the animation to end, `'updateCallbackDone'` settles as soon as the new DOM is in place. |

## When transitions run

Every navigation between pages runs in a view transition, except:

- the initial page load
- a navigation the browser already animated, such as a swipe-back gesture (`event.hasUAVisualTransition`)
- a browser without `document.startViewTransition()`

If a new navigation starts while a transition is still playing, the running transition is skipped so the new one can take over.
