# flat

the console app with its routes declared in one tree, the plain string views on the dom plugin.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` resolves to the repo itself through the `file:` dependency, and
`@semantic-ui/utils` through the root; vite is the example's own dev dependency, so `npm install`
here is still what brings it)

## the layout

- `client/routes.js` — the router and every route, one object
- `client/views/` — a function of its context per layout, page and slot, returning markup
- `client/app.js` — installs the plugins, mounts, and renders the app's own chrome
