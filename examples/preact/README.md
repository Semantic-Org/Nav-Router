# preact

the console app on the Preact integration: every layout, page and slot a Preact component, the
app's state a plain store the routes read, so an edit is a write followed by `reload()`.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/preact` are workspace packages, so `npm install` at
the root links them and brings vite; the versions here are what a clone of this example alone
installs from npm)

## the layout

- `client/routes.js` — the router, built by `preactRouter`, and every route
- `client/store.js` — the app's state: a plain object the routes' data() and guards read, and the writes
- `client/views/` — a Preact component per layout, page and slot, in jsx
- `client/app.js` — installs the plugins and mounts

## what a view is told

a view's props are its route's context: params, query, data, user and page. it renders again when
its route runs again. a layout kept across a navigation is not told, so what it shows of the page
it reads through `useRouter`, as the links in `root-layout.jsx` and the breadcrumbs do.

## signals

`@nav-router/preact/signals` is the same router on `@preact/signals`: a data() or a guard that reads
a signal runs again when it moves, and a kept layout's props stay current, so the store needs no
`reload()` and the views no `useRouter`.

## context

a Preact context provider inside a layout does not reach the pages in its slots: each view is its
own render root. the state the routes and views share is module-scoped, as `store.js` is.
