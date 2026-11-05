---
title: Back and forward
description: Each page counts how many times its data loaded. Going back shows what was there, without loading it again.
tabs: [routes.js, app.js]
try:
  - 'Open **One**, **Two** and **Three**. Each says its data loaded once.'
  - 'Press back twice, then forward. The counts stay at 1: each page comes back from its history entry.'
  - 'Click **One** in the page. That’s a new navigation, so it loads again and says 2.'
related:
  - { title: Loading data, href: /guides/loading-data/ }
---

A route's result rides on its history entry. When you go back or forward, the router shows what that
entry already had, so `data` doesn't run again and the counter doesn't move. Following a link to the
same page is a new navigation, so it loads afresh.
