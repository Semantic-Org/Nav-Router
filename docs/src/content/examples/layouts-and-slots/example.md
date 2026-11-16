---
title: Layouts and slots
description: Two nested layouts, a named aside slot, and active link helpers. Moving between pages swaps only the slots that changed.
tabs: [routes.js, app.js]
try:
  - 'Type something into the header input, then click **Team**, **Ada**, and **Mo**. Your text stays because `AppLayout` never remounts.'
  - 'Watch the right-hand panel: **Ada** and **Mo** project their role into `<slot name="aside">`, and clicking **Overview** restores the slot’s fallback.'
  - 'Compare **Team** in the header (`isActive`) with **Overview** in the sub-nav (`isCurrent`): **Team** stays active on `/team/ada`, while **Overview** is only current on `/team`.'
related:
  - { title: Layouts and slots, href: /guides/layouts-and-slots/ }
  - { title: isActive(), href: /api/is-active/ }
---

Each route renders into the nearest `<slot>` above it, and `slots` sends named pieces to the nearest
`<slot name="…">` up the tree—even across intermediate layouts. While a route stays active and its own
params haven't changed, its layout stays untouched in the DOM, and leaving a child route puts a named
slot's fallback children back.

`isActive('team')` stays true on `/team` and every route beneath it, while `isCurrent('team')` matches
only the `/team` index page itself. Updating them in `onRender` marks links inside layouts that stay
mounted across navigations.
