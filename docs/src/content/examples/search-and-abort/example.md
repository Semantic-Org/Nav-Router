---
title: Search and cancellation
description: A plain GET search form intercepted with no submit handler, and in-flight data cancelled via AbortSignal when a newer search starts.
tabs: [routes.js, app.js]
try:
  - 'Type `mo` and press Enter. Submitting the `<form>` navigates to `/people?q=mo` with no form event listener in `app.js`.'
  - 'Click **"a" (900ms)** and right away click **"ada" (150ms)**. The log shows `aborted "a"` before `loaded "ada"`, so the slower search never overwrites the newer one.'
related:
  - { title: Navigation and links, href: /guides/navigation/ }
  - { title: Loading data, href: /guides/loading-data/ }
---

A `<form>` whose method is GET navigates to its `action` with its fields in the query string, so the
browser fires the same `navigate` event as a link click. The router intercepts it, coerces `query.q`,
and keeps focus inside `<input id="q">` across the re-render.

Every `data` call receives the navigation's `signal`, an `AbortSignal` the browser aborts as soon as a
newer navigation begins. Passing `{ signal }` to `fetch()`—or clearing a timer on `abort`—cancels stale
work immediately instead of letting slow responses arrive out of order.
