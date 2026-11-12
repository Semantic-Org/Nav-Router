---
title: view-transitions
kind: plugin
lede: "Wraps settled page renders in `document.startViewTransition()` so outgoing and incoming views animate with CSS."
import: import '@nav-router/plugins/view-transitions'
size: view-transitions
updated: 2026-11-12
---

## Usage

Import `view-transitions` before creating your router:

```js for="core" label="app.js"
import '@nav-router/plugins/view-transitions';
import { router } from 'nav-router';

const app = router({
  mount: '#app',
  layout: () => `
    <header class="site-header"><a href="/projects">Projects</a></header>
    <main><slot></slot></main>
  `,
  routes: [
    { name: 'projects', path: '/projects', view: ProjectsList },
    { name: 'project', path: '/projects/:slug', view: ProjectDetail },
  ],
});

await app.start();
```

```jsx for="react" label="app.jsx"
import '@nav-router/plugins/view-transitions';
import { router } from '@nav-router/react';

function Layout({ children }) {
  return (
    <>
      <header className="site-header"><a href="/projects">Projects</a></header>
      <main>{children}</main>
    </>
  );
}

const app = router({
  mount: '#app',
  layout: Layout,
  routes: [
    { name: 'projects', path: '/projects', view: ProjectsList },
    { name: 'project', path: '/projects/:slug', view: ProjectDetail },
  ],
});

await app.start();
```

```tsx for="solid" label="app.tsx"
import '@nav-router/plugins/view-transitions';
import { router } from '@nav-router/solid';

function Layout() {
  return (
    <>
      <header class="site-header"><a href="/projects">Projects</a></header>
      <main><slot /></main>
    </>
  );
}

const app = router({
  mount: '#app',
  layout: Layout,
  routes: [
    { name: 'projects', path: '/projects', view: ProjectsList },
    { name: 'project', path: '/projects/:slug', view: ProjectDetail },
  ],
});

await app.start();
```

By default browsers cross-fade the root document. Assign `view-transition-name` in CSS to keep shared chrome stationary or morph matching elements between pages:

```css title="styles.css"
.site-header {
  view-transition-name: site-header;
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

- **Settled renders only** — intermediate `statusViews.loading` views swap without starting a separate transition; the snapshot runs once the destination page is ready.
- **No double animations** — skipped on the initial `start()` render and when the browser already animated a swipe gesture (`hasUAVisualTransition`).
- **Automatic fallback** — renders normally in browsers without `document.startViewTransition`.
- **Fast clicks cancel cleanly** — starting another navigation mid-animation calls `skipTransition()` right away.

## Settings

Pass `viewTransitions` to `router(options)`:

```params
- name: viewTransitions
  type: object
  default: "{}"
  description: View transition timing options.
  options:
    - name: waitFor
      type: "'finished' | 'updateCallbackDone'"
      default: "'finished'"
      description: "When the navigation handler resolves. `'finished'` holds browser scroll and focus reset until the animation ends; `'updateCallbackDone'` runs them as soon as the new DOM renders."
```
