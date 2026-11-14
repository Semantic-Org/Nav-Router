---
title: Titles and meta tags
description: Cascade page titles, meta descriptions, Open Graph properties, and canonical links across nested routes with the head plugin.
tabs: [routes.js, app.js]
try:
  - 'Click **Routing** and **Plugins**: `formatTitle` joins the guide’s title with the root’s, `description` overrides the root’s, `og:site_name` carries down, and `canonical` appears.'
  - 'Click **Home**: the guide’s `<link rel="canonical">` is removed and `description` reverts to the root value.'
related:
  - { title: head, href: /plugins/head/ }
  - { title: Route options, href: /api/route-options/ }
---

Every route can declare `title` in core, collected nearest-first on `page.titles`. Importing
`@nav-router/plugins/head` adds `formatTitle` to shape `document.title` from that trail, and `meta` on
each route to manage `<meta name="…">`, Open Graph `<meta property="og:…">`, and `<link rel="canonical">`.

Active routes merge their `meta` objects from root to leaf, so child routes override what they name and
inherit the rest. Tags the plugin creates or updates are tracked and restored automatically when you
navigate back out of the route that set them.
