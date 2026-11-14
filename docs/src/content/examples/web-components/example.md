---
title: Web components
description: Custom elements as a shadow-DOM layout and a property-driven view, with no framework adapter.
tabs: [routes.js, elements.js, app.js]
try:
  - 'Click **Ada** and **Mo**. Those links sit inside `<team-shell>`’s shadow root, and the browser’s `navigate` event catches them like any other anchor.'
  - 'Watch the right side of the header: `slots.role` projects into `<slot name="role">` inside the shadow root, and **Team** restores its `2 members` fallback.'
related:
  - { title: Web components, href: /guides/vanilla/web-components/ }
  - { title: View, href: /api/view/ }
---

Vanilla views return markup or DOM nodes, so custom elements need no adapter. Creating `<member-card>`
with `document.createElement()` lets `view` pass `data.member` as a JavaScript property instead of
serializing it into attributes.

When a layout's root element has an open `shadowRoot` with `<slot>` outlets, `nav-router` appends child
views as light-DOM children of the host and sets `slot="…"` attributes for named slots automatically.
Links inside the shadow root work without extra wiring because the router listens to `window.navigation`
rather than delegated click events.
