---
title: Loading states
description: Three routes load at three speeds, so you can watch `holdCommit`, `loadingDelay` and `loadingMin` decide what you see.
tabs: [routes.js, app.js]
try:
  - 'Open **Fast**. The URL and the page change together: the data was ready inside `holdCommit`.'
  - 'Open **Medium**. The URL moves at 300ms while the old page stays up, then the new page arrives with no loading view.'
  - 'Open **Slow**. The URL moves, then the loading view takes over until the data lands.'
  - "Add `loadingDelay: '0ms'` to `router({ … })` in `app.js` and open **Medium** again."
related:
  - { title: Router settings, href: /api/router/#settings }
---

Each route's `data` waits a different time before it answers. The router's defaults decide what you
see meanwhile:

| Setting | Default | What it does |
|---|---|---|
| `holdCommit` | `'300ms'` | How long the URL waits for data before committing. A fast load settles before the URL moves. |
| `loadingDelay` | `'200ms'` | Once the URL has moved, how long before the loading view shows. |
| `loadingMin` | `'500ms'` | Once the loading view shows, how long it stays, so it never flickers. |

The loading view is `statusViews.loading`, shown in the page's place while the data is on its way.
