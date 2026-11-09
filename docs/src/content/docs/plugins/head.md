---
title: head
kind: plugin
lede: Writes each page’s title, meta tags and canonical link into `document.head`, merged down the routes that are active.
import: import '@nav-router/plugins/head'
size: head
updated: 2026-11-05
---

## Install

Import the plugin once. A plugin wraps one moment in the router and calls through, so importing it changes nothing else, and its options are the router's own.

```js title="app.js"
import '@nav-router/plugins/head';
import { router } from 'nav-router';

const app = router({
  formatTitle: (title) => `${title} · Acme`,
  // the routes
});
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `formatTitle` | `function` | `null` | Turns a route’s title into the document title. |

## The `meta` route option

Give a route `meta`: an object, or a function of the route’s context returning one. Keys are tag names, and the plugin picks the tag for you.

```js
member: {
  path: '/team/:org/:userId',
  meta: ({ data }) => ({
    description: `${data.member.name} on Acme`,
    'og:image': data.member.avatar,
    canonical: `https://acme.app/team/${data.member.org}/${data.member.id}`,
  }),
},
```

| Key | Writes |
|---|---|
| `description` | `<meta name="description">` |
| `og:image` | `<meta property="og:image">`, as does any `og:`, `article:`, `profile:`, `book:` or `fb:` key |
| `canonical` | `<link rel="canonical">` |

### How tags merge

Tags merge from the root down the active routes, so a section sets what its pages share and a page overrides one key without restating the rest.

:::note[Your static tags are restored]
A tag already in your HTML is updated in place, and put back as it was when a later page clears it.
:::
