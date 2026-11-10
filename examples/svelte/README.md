# svelte

the console app on the Svelte integration: every layout, page and slot a Svelte 5 component, the
app's state as runes the routes read, so an edit reaches the page through the router's
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

## props

a view's props are the router's live context: `let { params, query, data, page } = $props()`. each
read is live, so a kept layout follows `params.org` and a page follows `data.members` with nothing
wired.

## slots

a layout marks where the content below it goes with the platform's `<slot>` element. Svelte's
compiler reads a bare `<slot>` as its own legacy slot, so a layout writes the element through
`<svelte:element this={'slot'}>`, which reaches the page as a real `<slot>`.

## context

`setContext` inside a layout does not reach the pages in its slots: each view is its own `mount`.
the state the routes and views share is module-scoped runes, as `store.svelte.js` does.
