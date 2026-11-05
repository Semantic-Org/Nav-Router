---
title: Not found
description: A route with nothing behind its param, and a path no route matches, both end on the not-found view with the URL left as typed.
tabs: [routes.js, app.js]
try:
  - 'Click **Zed**. The URL stays `/people/zed` and the not-found view shows in the page’s place.'
  - 'Click **Ada** for a page that exists, then press back to Zed.'
  - 'Click **Nowhere**. No route matches, so this one is a real page load: the app boots at `/nowhere` and shows the same view.'
related:
  - { title: Router settings, href: /api/router/#settings }
---

A route can match and still have nothing to show: `/people/zed` fits `/people/:userId`, but there is
no Zed. Its `data` returns `notFound()`, and the router shows `statusViews.notFound` in the page's
place. The URL stays as typed, so the reader can see what went wrong.

A path no route matches at all is different: the router leaves it to the browser, so it becomes a
normal page load and your server answers. Serve the app for unknown paths (the usual single-page
fallback, which this preview does too) and it boots, finds no route, and shows the same not-found
view.
