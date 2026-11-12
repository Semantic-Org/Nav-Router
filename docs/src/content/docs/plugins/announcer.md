---
title: announcer
kind: plugin
lede: Announces each new page through a live region in `document.body`, where Safari stays silent on intercepted navigations.
import: import '@nav-router/plugins/announcer'
size: announcer
updated: 2026-11-11
---

## Install

Import the plugin once. When the router starts, it places a hidden `aria-live` region in `document.body` and announces each page after it settles.

```js title="app.js"
import '@nav-router/plugins/announcer';
import { router } from 'nav-router';

const app = router({
  announcer: {
    politeness: 'polite',
  },
  // the routes
});
```

## Options

Pass an object under `announcer` on [`router()`](/api/router/#settings).

| Option | Type | Default | Description |
|---|---|---|---|
| `politeness` | `'polite' \| 'assertive'` | `'polite'` | Value of `aria-live` on the live region. |
| `format` | `function` | status + title | `(page) => string`. Builds the announced text. Return `''` or `null` to stay silent for that page. |

### Default announcement

When you don’t pass `format`, the plugin announces `page.title` (or the URL’s pathname when the route has no title), prefixed with the page’s status when it isn’t `'ok'`:

| `page.status` | Announces |
|---|---|
| `'ok'` | `'Settings'` |
| `'forbidden'` | `'Access denied, Settings'` |
| `'notFound'` | `'Not found, Settings'` |
| `'error'` | `'Error, Settings'` |
