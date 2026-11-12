---
title: Reactive state
lede: This guide covers tracking Solid signals inside route hooks and reading live router state directly in JSX.
updated: 2026-11-12
---

## Signals inside route hooks

`SolidRouter` extends [`ReactiveRouter`](/api/reactive-router/), running route hooks inside Solid computations. Any Solid signal or store read inside `data`, `permission`, `redirect`, or `title` is tracked automatically — updating that signal re-evaluates the hook in place without calling [`reload()`](/api/router/#reload):

```tsx title="routes.tsx"
import { router } from '@nav-router/solid';
import { createSignal, For } from 'solid-js';

const [showArchived, setShowArchived] = createSignal(false);

export const app = router({
  mount: '#app',
  routes: [
    {
      name: 'issues',
      path: '/projects/:org/issues',
      async data({ params, signal }) {
        const archived = showArchived();
        const res = await fetch(`/api/orgs/${params.org}/issues?archived=${archived}`, { signal });
        return { issues: await res.json() };
      },
      title: ({ data }) => `Issues (${data.issues.length})`,
      view: (props) => (
        <section>
          <label>
            <input
              type="checkbox"
              checked={showArchived()}
              onChange={(e) => setShowArchived(e.currentTarget.checked)}
            />
            Include archived
          </label>
          <ul>
            <For each={props.data.issues}>{(issue) => <li>{issue.title}</li>}</For>
          </ul>
        </section>
      ),
    },
  ],
});
```

Toggling `showArchived` re-runs `data` in place without resetting scroll or focus, updating `props.data.issues` and `document.title` once the fetch resolves.

Each reactive hook applies its result to the current page when a tracked signal changes:

- **`data`** — updates only the keys whose values changed, or swaps in `statusViews.notFound` if it returns `notFound()`
- **`permission`** — re-checks access; revoking access redirects to `signInRoute` or renders `statusViews.forbidden` in place, while granting access reloads a blocked page
- **`redirect`** — replaces the URL when a matched route's redirect target changes
- **`title`** — updates `page.title` and `document.title`

:::tip[Read signals before the first await]
Solid tracks reactive reads synchronously until the first `await`. In an `async` hook, read your signals at the top of the function before awaiting `fetch()`.
:::

## Reading router state in JSX

Router properties — `app.page`, `app.current`, `app.pending`, `app.user`, `app.error`, `app.canGoBack`, and `app.canGoForward` — are backed by Solid signals. Navigation helpers like [`isActive()`](/api/is-active/) and [`canAccess()`](/api/can-access/) read those signals too, so you can call them directly inside JSX or `createMemo()`:

```tsx title="TopBar.tsx"
import { back, href, isActive, isCurrent } from '@nav-router/solid';
import { Show } from 'solid-js';
import { app } from './routes.tsx';

export function TopBar() {
  return (
    <header>
      <button type="button" disabled={!app.canGoBack} onClick={() => back()}>
        Back
      </button>
      <nav>
        <a
          href={href('team', { org: 'acme' })}
          classList={{ active: isActive('team', { org: 'acme' }) }}
        >
          Acme
        </a>
        <a
          href={href('issues', { org: 'acme' })}
          aria-current={isCurrent('issues', { org: 'acme' }) ? 'page' : undefined}
        >
          Issues
        </a>
      </nav>
      <Show when={app.pending?.loading}>
        <span class="badge">Loading…</span>
      </Show>
    </header>
  );
}
```

No wrapper hook is needed — Solid subscribes only the DOM attribute or `<Show>` branch that reads each router signal.

## Updating `app.user` reactively

Assigning `app.user` writes to a Solid signal, waking active [guards](/guides/guards/) or `data` loaders that read `user` along with any views reading `props.user`:

```tsx title="auth.tsx"
import { router } from '@nav-router/solid';

export const app = router({
  mount: '#app',
  signInRoute: 'sign-in',
  routes: [
    { name: 'sign-in', path: '/sign-in', view: SignInPage },
    {
      name: 'billing',
      path: '/teams/:org/billing',
      permission: ({ user }) => user?.role === 'admin',
      view: BillingPage,
    },
  ],
});

export function signInAs(currentUser) {
  app.user = currentUser;
}

export function signOut() {
  app.user = null;
}
```

Calling `signOut()` while viewing `/teams/acme/billing` re-runs `permission` in place and redirects to `/sign-in` with `?returnTo=...` automatically. If your auth state already lives in a Solid signal, pass `identity: () => authUser()` to `router(options)` instead and `app.user` will stay synced whenever `authUser()` changes.
