---
title: Your first router
description: A layout, two named routes and a param. Every link is built from a route name, not a pasted path.
tabs: [routes.js, layout.js, app.js, index.html]
try:
  - 'Click **Ada**, then **Mo**. The URL bar follows: `/people/ada`, then `/people/mo`.'
  - 'Press back in the preview’s bar. Ada’s page comes back from history.'
  - 'Rename someone in `PEOPLE` in `routes.js`. The preview rebuilds and stays on the same page.'
related:
  - { title: Routes and params, href: /guides/routes-and-params/ }
  - { title: href(), href: /api/router/#href }
---

`routes` is the whole app: the root route holds the layout, `index` is the page at `/`, and `member`
takes a `:userId` param. The layout writes a `<slot>` where the page goes, and `href()` builds each
link from a route name and its params.

The links are plain anchors. The router catches the browser's own `navigate` event, so there is no
link component and nothing to wire up per link.
