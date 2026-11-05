# solid

the console app on the Solid integration: every layout, page and slot a Solid component, the
app's state as signals the routes read, so an edit reaches the page through the router's
reactive seams.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/solid` resolve to the repo itself through the
`file:` dependencies; vite is the example's own dev dependency, so `npm install` here is still
what brings it)

## the layout

- `client/routes.js` — the router, built by `solidRouter`, and every route
- `client/store.js` — the app's state: signals and a store the routes' data() and guards read
- `client/views/` — a Solid component per layout, page and slot, in jsx
- `client/app.js` — installs the plugins and mounts

## context

a Solid context provider inside a layout does not reach the pages in its slots: each view is its
own render root. a provider that must reach every view wraps the app above `solidRouter`, and the
state the routes and views share is module-scoped signals and stores, as `store.js` does.
