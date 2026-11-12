# react

the console app on the React integration: every layout, page and slot a React component, each
rendered with the route's context as its props.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/react` are workspace packages, so `npm install` at
the root links them and brings vite; the versions here are what a clone of this example alone
installs from npm)

## the layout

- `client/routes.js` — the router, built by `reactRouter`, and every route
- `client/store.js` — the app's state: plain values the routes' data() and guards read
- `client/views/` — a React component per layout, page and slot, in jsx
- `client/app.js` — installs the plugins and mounts

## props and useRouter

a view's props are its route's context: `params`, `query`, `data`, `user`, `page`. the router
renders a view again when its route runs again, so a page always has current props, while a layout
that stands across a navigation is left alone. what such a layout shows of the page under it, the
link to mark as current or the breadcrumb trail, it reads with `useRouter`, which renders the
component again whenever the router moves:

    const page = useRouter((router) => router.page);
    const current = useRouter(() => isCurrent('settings', { org }));

## slots

a layout writes `<slot></slot>` where the routes under it go and `<slot name='sidebar'>` for a
named one. the children a layout gives a slot are its fallback, shown while no route fills it; keep
them the same from one render to the next, since they wait outside the page while the slot is filled.

## state

the routes read the store when a navigation runs them, and nothing watches it. the user is the
exception the router knows about: `identity` is read at every navigation and a new user runs every
route again, so signing in is a write to the store and a `reload()`.

## context

a React context provider inside a layout does not reach the pages in its slots: each view is its
own root. the state the routes and views share is module-scoped, as `store.js` is.
