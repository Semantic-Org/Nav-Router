# nested

the same console app with its routes registered section by section, each section's routes in
its own folder beside the views they show.

## run

    npm install
    npm run dev

then open http://localhost:5173

(inside this repo `nav-router` is a workspace package, so `npm install` at the root links it and
brings vite; the version here is what a clone of this example alone installs from npm)

## the layout

- `client/router.js` — the router and its settings
- `client/routes.js` — the top-level routes, registered on the router
- `client/team/` — the team section: its routes and its views together
- `client/app.js` — installs the plugins, mounts, and renders the app's own chrome
