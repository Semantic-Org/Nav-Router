---
title: Unsaved changes
description: Hold link clicks and Back navigation when an editor has unsaved work, using confirm-leave and a native dialog.
tabs: [routes.js, app.js]
try:
  - 'Open **Edit**, type into the box, then click **Note** (or press **Back** in the preview bar). The navigation waits on the dialog.'
  - 'Choose **Stay**: the URL never moves and your text stays in place.'
  - 'Click **Save** instead: `note.saved` matches `note.draft`, so `canLeave` returns `true` and lets you straight through.'
related:
  - { title: confirm-leave, href: /plugins/confirm-leave/ }
  - { title: Guards and redirects, href: /guides/guards/ }
---

Importing `@nav-router/plugins/confirm-leave` teaches the router `canLeave` on routes (and
`router.confirmLeave()` for dynamic blockers) plus automatic `beforeunload` registration only while a
blocker is active, so clean pages stay eligible for the back-forward cache.

Returning a string from `canLeave` hands the message to `confirm`, which defaults to `window.confirm`
and accepts a `Promise<boolean>` for custom modals. While the promise is open, the router holds URL
commit on link clicks and rolls back history traverses if the user chooses to stay.
