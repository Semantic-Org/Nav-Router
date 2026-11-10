# react

the console app on the React integration: every layout, page and slot a React component, the
app's state as signals the routes read, so an edit reaches the page through the router's
reactive seams.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/react` are workspace packages, so `npm install` at
the root links them and brings vite; the versions here are what a clone of this example alone
installs from npm)

## the layout

- `client/routes.js` — the router, built by `reactRouter`, and every route
- `client/store.js` — the app's state: signals the routes' data() and guards read
- `client/views/` — a React component per layout, page and slot, in jsx
- `client/app.js` — installs the plugins and mounts

## props

a view's props are the router's context as a plain snapshot: `params`, `query`, `user`, `page`,
`data` and the rest. the view renders again when any of them moves, and React's diff keeps the dom
that did not. a component that reads the router's state or a signal of the app's on its own reads
it through `useLive(() => ...)`, as the root layout's links and the sidebar do.

## context

a React context provider inside a layout does not reach the pages in its slots: each view is its
own React root. the state the routes and views share is module-scoped signals, as `store.js` does.
