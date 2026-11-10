# preact

the console app on the Preact integration: every layout, page and slot a Preact component, the
app's state as signals the routes read, so an edit reaches the page through the router's
reactive seams.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/preact` are workspace packages, so `npm install` at
the root links them and brings vite; the versions here are what a clone of this example alone
installs from npm)

## the layout

- `client/routes.js` — the router, built by `preactRouter`, and every route
- `client/store.js` — the app's state: `@preact/signals` the routes' data() and guards read
- `client/views/` — a Preact component per layout, page and slot, in jsx
- `client/app.js` — installs the plugins and mounts

## props

a view's props are the router's live context: a component that reads `props.params.org` or
`props.data.members` while it renders is rendered again when that key moves, and by nothing else.
hand `params`, `query` and `data` to a child as they are and the child is told by what it reads;
spreading the whole of `props` onto a child reads every key in the parent.

## context

a Preact context provider inside a layout does not reach the pages in its slots: each view is its
own render root. a provider that must reach every view wraps the app above `preactRouter`, and the
state the routes and views share is module-scoped signals, as `store.js` does.
