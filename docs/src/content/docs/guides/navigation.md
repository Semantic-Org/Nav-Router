---
title: Navigation and links
lede: This guide covers how links and forms work with the Navigation API alongside programmatic navigation helpers.
updated: 2026-11-12
---

## Links and GET forms

Because `nav-router` listens to the browser's Navigation API, you write ordinary `<a href>` links and `<form method="get">` forms instead of importing a framework `<Link>` component:

```html
<a href="/teams/acme/members">Members</a>

<form method="get" action="/projects/acme/issues">
  <input type="search" name="q" placeholder="Search issues" />
  <button type="submit">Search</button>
</form>
```

Standard HTML behaviors pass straight through to the browser without interception:

- **New tabs and modifier keys** — `target="_blank"`, middle-clicks, and Cmd/Ctrl/Shift-clicks open natively in the browser.
- **Downloads and external links** — links with `rel="external"`, a `download` attribute, or a cross-origin URL bypass the router.
- **Unmatched URLs and `POST` forms** — URLs that match no route and `<form method="post">` submissions fall through to normal browser navigation.
- **Same-page `#hash` jumps** — anchor links on the current URL scroll to the target element without re-running guards or `data`.

## Building URLs with `href()`

Hardcoding path strings scatters route patterns across your templates. Call [`href()`](/api/router/#href) with a route name and an `args` object so path structure stays in one place:

```js
import { href } from 'nav-router';

// :params fill the path; remaining keys become query parameters
href('issues', { org: 'acme', status: 'closed', page: 2 });
// => '/projects/acme/issues?status=closed&page=2'

// Default query values are omitted; Boolean params serialize as bare flags
href('issues', { org: 'acme', status: 'open', archived: true });
// => '/projects/acme/issues?archived'
```

- **Flat `args` splitting** — keys declared as `:params` on the target route fill path segments (throwing if a required param is missing), and every other key becomes a query parameter.
- **Clean query strings** — values matching their declared `default` (`status: 'open'` above) are omitted, `Boolean` flags serialize as `?archived`, and `base` is prepended automatically.
- **Query carry-over and hashes** — pass `{ keepQuery: true }` as the third argument to preserve current query values, or `{ hash: 'comments' }` to append `#comments`.

## Programmatic navigation

Import navigation helpers directly from `nav-router` (or your framework integration) to navigate from event handlers or form actions:

```js
import { back, navigate, reload, replace, update } from 'nav-router';

// Navigate to a route (await .finished if you need data to settle)
await navigate('member', { org: 'acme', id: 42 }).finished;

// Replace the current history entry instead of pushing a new one
replace('onboarding-complete');

// Update query or params on the current route in place
update({ status: 'closed', q: undefined });

// Re-run guards and data after saving server changes
await reload().finished;

// Step back inside your app, or fall back when opened in a new tab
back('projects', { org: 'acme' });
```

- **[`update()`](/api/update/)** — merges keys into the current route's `params` and `query` with `history: 'replace'` while keeping scroll and focus untouched. Pass `undefined` to remove a key.
- **[`reload()`](/api/router/#reload)** — re-runs `identity`, guards, and `data` for the current URL without a full browser refresh.
- **[`back(fallback, args)`](/api/router/#back)** — steps back when `router.canGoBack` is `true` (meaning the previous session entry belongs to this router). When a user opened the link directly in a new tab or arrived from another site, it navigates to `fallback` (defaulting to `'/'`) so in-app Back buttons never leave your site. Try it in the [Back and forward example](/examples/back-and-forward/).

## Styling active links

Use [`isActive()`](/api/is-active/) to highlight a parent section while any child page beneath it is open, and `isCurrent()` when a link should only match the exact leaf page:

:::truth
| Call | On `/settings` | On `/settings/billing` |
| --- | --- | --- |
| `isActive('settings')` | true | true |
| `isCurrent('settings')` | true | false |
| `isCurrent('billing')` | false | true |
:::

Pass a second `args` object (such as `isActive('team', { org: 'acme' })`) when the link only matches specific parameter or query values. In persistent layouts, subscribe to router changes so active classes update as child pages change:

```js for="core" label="routes.js"
import { href, isActive } from 'nav-router';

app.subscribe(() => {
  document.querySelector('[data-nav="settings"]')
    ?.classList.toggle('active', isActive('settings'));
});
```

```jsx for="react" label="routes.jsx"
import { href, isActive, useRouter } from '@nav-router/react';

export function NavLink({ to, args, children }) {
  const active = useRouter(() => isActive(to, args));
  return (
    <a href={href(to, args)} className={active ? 'active' : undefined}>
      {children}
    </a>
  );
}
```

```tsx for="solid" label="routes.tsx"
import { href, isActive } from '@nav-router/solid';

export function NavLink(props) {
  return (
    <a href={href(props.to, props.args)} classList={{ active: isActive(props.to, props.args) }}>
      {props.children}
    </a>
  );
}
```

## Scroll and focus

Navigating to a new page scrolls to the top of the window (or to `#hash`) and resets focus after the new view renders. Query-only changes on the current route (along with `update()` and `reload()`) leave scroll and focus in place so typing in a filter input never jumps the page; you can also pass `resetScroll: false` or `resetFocus: false` to [`navigate()`](/api/router/#navigate).

On Back and Forward navigation, the browser restores window scroll position automatically. If your layout scrolls inside inner containers instead of the window, list their selectors in `restoreScroll`:

```js title="app.js"
const app = router({
  mount: '#app',
  restoreScroll: ['.sidebar', '.main-pane'],
  routes,
});
```
