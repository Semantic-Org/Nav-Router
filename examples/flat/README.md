# flat

the console app with its routes declared in one tree, the plain string views on the dom plugin.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` is a workspace package, so `npm install` at the root links it and
brings vite; the version here is what a clone of this example alone installs from npm)

## the layout

- `client/routes.js` — the router and every route, one object
- `client/views/` — a function of its context per layout, page and slot, returning markup
- `client/app.js` — installs the plugins, mounts, and renders the app's own chrome
