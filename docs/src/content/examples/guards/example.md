---
title: Guards and sign-in
description: A settings page only an admin may open. Signed out, the router sends you to sign in; signed in as a member, it refuses.
tabs: [routes.js, app.js]
try:
  - 'Signed out, open **Settings**. The guard refuses before the URL moves, and you land on **Sign in** with the page you wanted as `returnTo`.'
  - 'Sign in as a member. You go back to Settings, and this time the forbidden view refuses you.'
  - 'Sign in as an admin, and Settings opens.'
related:
  - { title: Guards and redirects, href: /guides/guards/ }
  - { title: Router settings, href: /api/router/#settings }
---

`permission` is a route's guard: a function of the context that answers whether this user may open
it. It runs before the URL moves, so a refused page never enters history.

What happens on a refusal depends on who is asking. With no user, the router sends the reader to
`signInRoute`, adding the page it wanted as `returnTo`. With a user who lacks the role, it shows
`statusViews.forbidden` instead. The sign-in buttons set `app.user` and navigate to `returnTo`, which
runs the guards again with the new user.
