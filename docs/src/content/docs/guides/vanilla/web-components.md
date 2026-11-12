---
title: Web components
lede: This guide covers using custom elements as route views and layouts with light DOM or open Shadow DOM slots.
updated: 2026-11-12
---

## Custom elements as views

Because Vanilla JS routes render HTML markup or DOM nodes directly, custom elements work in `view`, `layout`, `slots`, and `statusViews` without an adapter.

Return an HTML tag string when passing string attributes like URL parameters, or create the element with `document.createElement()` to set rich `data` objects as JS properties and listen for custom events:

```js title="routes.js"
import { navigate, router } from 'nav-router';
import './team-overview.js';
import './member-editor.js';

const app = router({
  mount: '#app',
  routes: [
    {
      name: 'team',
      path: '/teams/:org',
      view: ({ params }) => `<team-overview org="${params.org}"></team-overview>`,
    },
    {
      name: 'member',
      path: '/teams/:org/members/:id',
      async data({ params, signal }) {
        const res = await fetch(`/api/teams/${params.org}/members/${params.id}`, { signal });
        return { member: await res.json() };
      },
      view({ data }) {
        const editor = document.createElement('member-editor');
        editor.member = data.member;
        editor.addEventListener('member-saved', () => {
          navigate('team', { org: data.member.org });
        });
        return editor;
      },
    },
  ],
});

await app.start();
```

Your element's `connectedCallback()` runs when the route mounts, and `disconnectedCallback()` runs when leaving the route (or before a fresh element mounts when that route updates in place).

## Layouts with open Shadow DOM

A custom element used as a `layout` can declare `<slot></slot>` and `<slot name="...">` inside an open shadow root (`attachShadow({ mode: 'open' })`).

When a top-level layout element exposes an open `shadowRoot` with a matching `<slot>`, `nav-router` appends child views as light-DOM children of that host element and manages `slot="..."` attributes automatically for named slots:

```js title="team-shell.js"
class TeamShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: grid; grid-template-columns: 16rem 1fr; gap: 1.5rem; }
      </style>
      <aside>
        <slot name="sidebar"><p>Team directory</p></slot>
      </aside>
      <main><slot></slot></main>
    `;
  }
}

customElements.define('team-shell', TeamShell);
```

```js title="routes.js"
import './team-shell.js';

app.section({
  path: '/teams/:org',
  layout: ({ params }) => `<team-shell org="${params.org}"></team-shell>`,
  routes: [
    {
      name: 'members',
      path: '/teams/:org/members',
      view: () => '<member-list></member-list>',
      slots: {
        sidebar: () => '<member-filters></member-filters>',
      },
    },
  ],
});
```

`<member-list>` projects into `<slot></slot>` while `<member-filters>` receives `slot="sidebar"` automatically. Navigating between child routes under `/teams/acme` keeps `<team-shell>` mounted.

## Light DOM and closed shadow roots

- **Light DOM custom elements** — Elements that render without `attachShadow()` work like standard HTML layouts: place `<slot></slot>` or `<slot name="...">` inside the element, and child views swap directly into those slots while preserving fallback content.
- **Closed Shadow DOM (`mode: 'closed'`)** — Because `element.shadowRoot` is `null`, layouts cannot expose router `<slot>` outlets inside a closed shadow root. Leaf `view` elements without child routes can still use closed shadow roots.

:::note
Register layout custom elements with `customElements.define()` before the route renders (or inside a [`lazy()`](/api/lazy/) layout module) so their `<slot>` elements exist when the layout connects.
:::
