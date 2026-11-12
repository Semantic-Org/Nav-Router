---
title: Views and props
lede: This guide covers fine-grained `props` tracking in Solid views and composing layouts with `<slot>` outlets.
updated: 2026-11-12
---

## Fine-grained view props

A Solid view function runs **once** when its route activates and stays mounted while you navigate between parameters or query values on that route. Instead of re-creating the component, `@nav-router/solid` backs `props` with per-key signal getters so only expressions reading a changed key re-run:

```tsx title="MemberPage.tsx"
import { createEffect, Show } from 'solid-js';

export function MemberPage(props) {
  createEffect(() => {
    console.log('Active tab:', props.query.tab);
  });

  return (
    <article>
      <h1>{props.data.member.name}</h1>
      <p>Team: {props.params.org}</p>
      <Show when={props.user?.role === 'admin'}>
        <button type="button">Manage access</button>
      </Show>
    </article>
  );
}
```

Switching from `?tab=profile` to `?tab=activity` on `/teams/acme/members/ada` updates `props.query.tab` in place: the `createEffect` callback runs again, while the DOM bindings reading `props.data.member.name` and `props.params.org` stay untouched.

Every view, layout, slot component, and status view receives:

- **`props.params`** and **`props.query`** — per-key reactive proxies; reading `props.params.id` tracks only `id`, and kept parent layouts also see updated child params
- **`props.data`** — merged route and ancestor data behind per-key getters, so updating `member` wakes only readers of `props.data.member`
- **`props.user`** — reactive getter for `router.user`
- **`props.page`** — reactive getter for the rendered page (`props.page.url`, `props.page.status`, `props.page.title`, `props.page.error`)
- **`props.route`**, **`props.router`**, and **`props.signal`** — the owning [`Route`](/api/route/), `SolidRouter` instance, and an `AbortSignal` tied to the route's active lifetime

## Avoid destructuring `props`

Destructuring `props` in the argument list or at the top of a component reads its getters once outside a tracked scope, freezing their initial values:

```tsx
// Don't: reads props.data.post once on mount and never updates
function BrokenPost({ data }) {
  return <h1>{data.post.title}</h1>;
}

// Do: reads props.data.post inside JSX or a thunk so Solid tracks it
function Post(props) {
  const heading = () => `${props.data.post.title} (${props.params.slug})`;
  return <h1>{heading()}</h1>;
}
```

When deriving values outside JSX, wrap reads in a function (`() => props.data.post`) or `createMemo()`.

## Layouts and named slots

Layouts use native HTML `<slot />` for the primary child view and `<slot name="..." />` for [named slots](/guides/layouts-and-slots/). Any children inside a `<slot>` element act as fallback content when no active route fills that slot:

```tsx title="TeamLayout.tsx"
export function TeamLayout(props) {
  return (
    <div class="workspace">
      <header>
        <h2>Team {props.params.org}</h2>
      </header>
      <aside>
        <slot name="sidebar">
          <p>No sidebar on this page.</p>
        </slot>
      </aside>
      <section>
        <slot />
      </section>
    </div>
  );
}
```

```tsx title="routes.tsx"
app.section({
  path: '/teams/:org',
  layout: TeamLayout,
  slots: { sidebar: TeamSidebar },
  routes: [
    { name: 'member', path: '/teams/:org/members/:id', view: MemberPage },
    { name: 'print', path: '/teams/:org/print', slots: { sidebar: null }, view: PrintPage },
  ],
});
```

Visiting `/teams/acme/print` clears `sidebar`, restoring `<p>No sidebar on this page.</p>` while `TeamLayout` stays mounted.

## Cleanup with `onCleanup`

Each `SolidView` mounts inside its own Solid reactive root and disposes that root when the route deactivates. Register teardown logic with Solid's `onCleanup()` (or pass `props.signal` to `fetch()` and `addEventListener()`):

```tsx title="ProjectStream.tsx"
import { onCleanup } from 'solid-js';

export function ProjectStream(props) {
  const socket = new WebSocket(`wss://example.com/projects/${props.params.id}`);
  onCleanup(() => socket.close());

  return <section>Streaming project {props.params.id}</section>;
}
```
