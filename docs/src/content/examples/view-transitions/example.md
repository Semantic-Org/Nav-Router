---
title: View transitions
description: One plugin import wraps every route swap in document.startViewTransition(), morphing shared elements across pages.
tabs: [routes.js, style.css, app.js]
try:
  - 'Click **Coral**, **Amber**, or **Sky**. The tile morphs into the detail banner because both carry the same `view-transition-name`.'
  - 'Click **← All swatches** or press **Back** in the preview bar to watch the banner morph back into its tile.'
related:
  - { title: view-transitions, href: /plugins/view-transitions/ }
  - { title: Writing a plugin, href: /guides/writing-a-plugin/ }
---

Importing `@nav-router/plugins/view-transitions` wraps `applyCascade`—the single moment where leaving
views come down and entering views go up—inside `document.startViewTransition()`. It skips the initial
render and browser swipe gestures that already ran their own visual transition.

Give matching elements on two routes the same `view-transition-name` and the browser animates geometry
and color between the old snapshot and the new DOM automatically. If a second navigation starts mid-flight,
the plugin skips the running transition on `event.signal` abort so the UI never queues stale animations.
