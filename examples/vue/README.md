# vue

the console app on the Vue integration: every layout, page and slot a single-file component, the
app's state as refs the routes read, so an edit reaches the page through the router's reactive
seams.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` and `@nav-router/vue` are workspace packages, so `npm install` at
the root links them and brings vite; the versions here are what a clone of this example alone
installs from npm)

## the layout

- `client/routes.js` — the router, built by `vueRouter`, and every route
- `client/store.js` — the app's state: refs and a reactive list the routes' data() and guards read
- `client/views/` — a single-file component per layout, page and slot
- `client/app.js` — installs the plugins and mounts

## props

a view is handed the router's context as the props it declares, so `defineProps(['params', 'data'])`
is the whole wiring and a view that declares none is handed none. they are live: a template that
reads `params.org` or `data.members` renders again when that key moves.

## slots

a `<slot>` in a Vue template is Vue's own outlet and renders no element, so a layout writes the
element the router fills as `<component is="slot" />`, with a `name` for a named one.

## context

each view is its own render root, and provide and inject still cross where a Vue app expects them
to. what a layout provides in its setup reaches the pages and slots inside it, as `team-layout.vue`
does for `member-page.vue`. what the app provides, installs or registers reaches every view once
the router is used by it, `createApp({}).use(app)` in `app.js`.
