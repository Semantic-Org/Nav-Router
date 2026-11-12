---
title: announcer
kind: plugin
lede: "Announces each settled page change to screen readers through a hidden `aria-live` region."
import: import '@nav-router/plugins/announcer'
size: announcer
updated: 2026-11-12
---

## Usage

Intercepted single-page navigations do not always trigger a browser page-load announcement, particularly in Safari with VoiceOver. Import `@nav-router/plugins/announcer` before creating your router to append a visually hidden `aria-live` region when `start()` runs:

```js for="core" label="app.js"
import '@nav-router/plugins/announcer';
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  index: {
    title: 'Dashboard',
    view: () => '<h1>Dashboard</h1>',
  },
  routes: [
    {
      name: 'billing',
      path: '/settings/billing',
      title: 'Billing settings',
      view: () => '<h1>Billing settings</h1>',
    },
  ],
});

await app.start();
```

```jsx for="react" label="app.jsx"
import '@nav-router/plugins/announcer';
import { router } from '@nav-router/react';

const app = router({
  mount: '#app',
  index: {
    title: 'Dashboard',
    view: () => <h1>Dashboard</h1>,
  },
  routes: [
    {
      name: 'billing',
      path: '/settings/billing',
      title: 'Billing settings',
      view: () => <h1>Billing settings</h1>,
    },
  ],
});

await app.start();
```

```tsx for="solid" label="app.tsx"
import '@nav-router/plugins/announcer';
import { router } from '@nav-router/solid';

const app = router({
  mount: '#app',
  index: {
    title: 'Dashboard',
    view: () => <h1>Dashboard</h1>,
  },
  routes: [
    {
      name: 'billing',
      path: '/settings/billing',
      title: 'Billing settings',
      view: () => <h1>Billing settings</h1>,
    },
  ],
});

await app.start();
```

- **Announces after settle** — speaks once the navigation finishes so focus changes do not cut off the announcement.
- **Includes page status** — prefixes `'Access denied'`, `'Not found'`, or `'Error'` onto `page.title` (falling back to the URL pathname when a route has no `title`).
- **Stays quiet on non-page updates** — skips the initial page load, intermediate `loading` views, `#hash` jumps, and query changes on the same route whose text did not change.
- **Cleans up on `stop()`** — removes the live region element when the router stops.

## Settings

Pass `announcer` to `router(options)`:

```params
- name: announcer
  type: object
  default: "{}"
  description: Live region configuration.
  options:
    - name: politeness
      type: "'polite' | 'assertive'"
      default: "'polite'"
      description: Value for the live region's `aria-live` attribute.
    - name: format
      type: "(page) => string"
      description: "Builds the announced text from `router.page`. Return `''` to skip announcing a render."
```

Customize `format` when your app follows a house screen-reader phrasing:

```js title="app.js"
const app = router({
  announcer: {
    format: (page) => (page.title ? `Showing ${page.title}` : ''),
  },
  // ...routes
});
```
