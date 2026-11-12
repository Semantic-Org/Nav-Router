---
title: chunk-reload
kind: plugin
lede: Recovers once when a fresh deploy has removed the old code chunk an in-flight navigation needs.
import: import '@nav-router/plugins/chunk-reload'
size: chunk-reload
updated: 2026-11-11
---

## Install

Import the plugin once. When a [`lazy()`](/api/lazy/) view fails to load during a navigation — as happens when a deploy replaces hashed bundle files while a tab is open — the plugin reloads the document at the destination URL so the page picks up the new build.

```js title="app.js"
import '@nav-router/plugins/chunk-reload';
import { lazy, router } from 'nav-router';

const app = router({
  routes: {
    settings: {
      path: '/team/:org/settings',
      view: lazy(() => import('./settings-page.js')),
    },
  },
});
```

## Options

Pass an object under `chunkReload` on [`router()`](/api/router/#settings).

| Option | Type | Default | Description |
|---|---|---|---|
| `storageKey` | `string` | `'nav-router:chunk-reload'` | `sessionStorage` key used to remember the URL that just reloaded, so a broken chunk reloads at most once. |
| `reload` | `function` | `location.assign(url)` or `location.reload()` | `(url) => void`. Performs the full page load for `url`. |
