# vue

the console app on the Vue integration: every layout, page and slot a Vue single-file component,
the app's state as refs the routes read, so an edit reaches the page through the router's
reactive seams.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/vue` are workspace packages, so `npm install` at
the root links them and brings vite; the versions here are what a clone of this example alone
installs from npm)

## the layout

- `client/routes.js` — the router, built by `vueRouter`, and every route
- `client/store.js` — the app's state: refs the routes' data() and guards read
- `client/views/` — a Vue component per layout, page and slot
- `client/app.js` — installs the plugins and mounts

## a view reads its context

a view takes no props. `useViewContext()` returns the context of the view a component is in,
with `params`, `query`, `data`, `user` and `page`, live as the router moves. read through it where
the value is used, `context.data.members`, as with Vue's own `props`: `data`, `user` and `page`
are read fresh at every access, so a destructured one stays as it was.

## slots

Vue's templates keep `<slot>` for a component's own slots, so a layout writes `<RouterSlot />`
where its views go, and `<RouterSlot name="sidebar">` for a named one, its children the fallback.

## plugins and provide

each view is a Vue app of its own, so `provide` in a layout does not reach the pages in its slots
and no one app holds them all. `setupApp` on the router is called with every view's app before it
mounts, and is where a plugin, a global component or a provide is installed. the state the routes
and views share is module-scoped refs, as `store.js` does.
