---
title: Lazy views and preload
description: Split a route into its own module with lazy(), and warm it on hover or focus with preload-intent before the click lands.
tabs: [routes.js, report.js, app.js]
try:
  - 'Look at the top-right status on load: `report.js: not loaded`. The report module has not been fetched yet.'
  - 'Hover over **Quarterly report** without clicking. After 300ms the status flips to `report.js warmed`, and clicking opens the page immediately.'
related:
  - { title: lazy(), href: /api/lazy/ }
  - { title: preload-intent, href: /plugins/preload-intent/ }
---

`lazy(() => import('./report.js'))` marks a dynamic import thunk so the router distinguishes it from a
plain view function without calling it early. The promise is shared and cached on first run, so a preload
and a navigation never fetch the module twice.

`@nav-router/plugins/preload-intent` listens for `pointerover`, `focusin`, and `touchstart` on matching
in-app links (skipping external links and `Save-Data` connections) and resolves the target route's lazy
views ahead of the click. It also adds `router.preload(name, params)` for warming a route in code.
