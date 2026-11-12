---
title: chunk-reload
kind: plugin
lede: "Recovers from missing lazy-loaded chunks after a new deploy by reloading the target URL once."
import: import '@nav-router/plugins/chunk-reload'
size: chunk-reload
updated: 2026-11-12
---

## Usage

Bundlers stamp code-split chunks with content hashes. When a fresh deploy removes older chunks from your server, users who still have an earlier tab open can hit a failed module import the next time they navigate to a [`lazy()`](/api/lazy/) route.

Import `@nav-router/plugins/chunk-reload` before creating your router to recover automatically with a full document load:

```js title="app.js"
import '@nav-router/plugins/chunk-reload';
import { lazy, router } from 'nav-router';

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'reports',
      path: '/reports',
      view: lazy(() => import('./views/reports.js')),
    },
  ],
});

await app.start();
```

- **Lands on the destination URL** — detaches router interception and navigates the document directly to the target URL so the user arrives on the page they clicked with fresh HTML and asset hashes.
- **Tries at most once per URL** — records the attempted URL in `sessionStorage` and clears it once a navigation settles. If loading that URL fails again immediately, normal error handling (`onError` and `statusViews.error`) runs instead of looping.
- **Skips offline errors** — leaves failures while `navigator.onLine` is `false` to your app's error view rather than triggering a browser offline screen.
- **Ignores background preloads** — a failed hover preload from [`preload-intent`](/plugins/preload-intent/) does not reload the current page unless the user actually navigates to that route.

## Settings

Pass `chunkReload` to `router(options)`:

```params
- name: chunkReload
  type: object
  default: "{}"
  description: Chunk recovery options.
  options:
    - name: storageKey
      type: string
      default: "'nav-router:chunk-reload'"
      description: "`sessionStorage` key tracking the last reloaded URL so repeated failures do not loop."
    - name: reload
      type: "(url) => void"
      description: "Custom document load handler. Defaults to `location.assign(url)` (or `location.reload()` when already at `url`). Because router listeners detach before `reload` runs, custom handlers must perform a full document navigation."
```
