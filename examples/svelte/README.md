# svelte

the console app on the Svelte integration: every layout, page and slot a Svelte component, the
app's state as `$state` the routes read, so an edit reaches the page through the router's
reactive seams.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/svelte` are workspace packages, so `npm install` at
the root links them and brings vite; the versions here are what a clone of this example alone
installs from npm)

## the layout

- `client/routes.js` — the router, built by `svelteRouter`, and every route
- `client/store.svelte.js` — the app's state: one `$state` object the routes' data() and guards read
- `client/views/` — a Svelte component per layout, page and slot
- `client/app.js` — installs the plugins and mounts

## slots

a layout says where the views below it go with the integration's `Slot` component, `<Slot />` or
`<Slot name="sidebar">`, whose children are the slot's fallback. the router looks for a `<slot>`
element in the layout, and Svelte compiles a `<slot>` tag away as its own legacy slot, so the
component writes the element for you.

## context

a context set inside a layout does not reach the pages in its slots: each view is mounted as its
own root. the state the routes and views share is module-scoped `$state`, as `store.svelte.js`
has it.
