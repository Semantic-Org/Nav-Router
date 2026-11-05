---
title: Query params
description: A task list filtered by a typed query param, with a toggle that changes the query in place.
tabs: [routes.js, app.js]
try:
  - 'Click **Done**, then **All**. The URL’s `?status=` changes and the list follows.'
  - 'Click **Compact**. `update()` adds `&compact` in place and the view gets a real `true`.'
  - 'Click **Show details** to remove it again.'
related:
  - { title: Routes and params, href: /guides/routes-and-params/#query-works-the-same-way }
---

`query` declares each key the route reads. `status` has a default and a fixed set of values, and
`compact` is read as a boolean because its default is `false`, so the view gets a real `true` or
`false`, never the string. A value outside `allowed`, such as `?status=nope`, falls back to the
default.

The filter links are plain anchors built with `href()`. The compact toggle calls `update()`, which
changes the current page's query in place: the URL is replaced, and scroll and focus stay put.
