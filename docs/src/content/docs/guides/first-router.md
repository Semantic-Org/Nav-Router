---
title: Your first router
lede: This guide walks through mounting a router, sharing a layout, linking to named routes, and reading URL parameters.
updated: 2026-11-12
---

## Build a two-route app

We will build the team directory from the [Your first router](/examples/first-router/) playground: a shared navigation header wrapping a home page at `/` and profile pages at `/people/:userId`.

::::steps
1. **Add a mount element**

   Create an `index.html` file with a container element where your app will render, and load your entry module:

   ```html title="index.html"
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="utf-8">
       <title>Team directory</title>
     </head>
     <body>
       <div id="app"></div>
       <script type="module" src="./app.js"></script>
     </body>
   </html>
   ```

   :::for[react]
   Point the `<script>` tag at `./app.jsx` in a React setup.
   :::

   :::for[solid]
   Point the `<script>` tag at `./app.tsx` in a Solid setup.
   :::

2. **Create a shared layout and links**

   In your routes file, define a `Layout` with navigation links built by [`href()`](/api/router/#href) and a slot for the active page:

   ```js for="core" label="routes.js"
   import { href } from 'nav-router';

   const Layout = () => `
     <header>
       <a href="${href('home')}">Team</a>
       <a href="${href('member', { userId: 'ada' })}">Ada</a>
       <a href="${href('member', { userId: 'mo' })}">Mo</a>
     </header>
     <main><slot></slot></main>
   `;
   ```

   ```jsx for="react" label="routes.jsx"
   import { href } from '@nav-router/react';

   function Layout({ children }) {
     return (
       <>
         <header>
           <a href={href('home')}>Team</a>
           <a href={href('member', { userId: 'ada' })}>Ada</a>
           <a href={href('member', { userId: 'mo' })}>Mo</a>
         </header>
         <main>{children}</main>
       </>
     );
   }
   ```

   ```tsx for="solid" label="routes.tsx"
   import { href } from '@nav-router/solid';

   function Layout() {
     return (
       <>
         <header>
           <a href={href('home')}>Team</a>
           <a href={href('member', { userId: 'ada' })}>Ada</a>
           <a href={href('member', { userId: 'mo' })}>Mo</a>
         </header>
         <main><slot /></main>
       </>
     );
   }
   ```

   `href('member', { userId })` builds `'/people/ada'` from the route's name rather than a hardcoded path string. Each link is a standard `<a href>` anchor — the router intercepts clicks through `window.navigation` with no `<Link>` wrapper.

   :::for[core]
   Always close `<slot></slot>` explicitly in HTML strings so the browser's HTML parser does not swallow elements after it.
   :::

   :::for[react]
   In `@nav-router/react`, layouts receive the active child view on the `children` prop.
   :::

   :::for[solid]
   In `@nav-router/solid`, layouts render a `<slot />` element where the active child component mounts.
   :::

3. **Define `index` and a parameterized route**

   Below `Layout`, export your route tree with `index` for `'/'` and a `member` route for `'/people/:userId'`:

   ```js for="core" label="routes.js"
   const PEOPLE = { ada: 'Ada Park', mo: 'Mo Reyes' };

   export const routes = {
     name: 'home',
     layout: Layout,
     index: {
       path: '/',
       view: () => '<h1>Team</h1><p>Pick a team member above.</p>',
     },
     routes: {
       member: {
         path: '/people/:userId',
         view: ({ params }) => `<h1>${PEOPLE[params.userId]}</h1>`,
       },
     },
   };
   ```

   ```jsx for="react" label="routes.jsx"
   const PEOPLE = { ada: 'Ada Park', mo: 'Mo Reyes' };

   export const routes = {
     name: 'home',
     layout: Layout,
     index: {
       path: '/',
       view: () => (
         <>
           <h1>Team</h1>
           <p>Pick a team member above.</p>
         </>
       ),
     },
     routes: {
       member: {
         path: '/people/:userId',
         view: ({ params }) => <h1>{PEOPLE[params.userId]}</h1>,
       },
     },
   };
   ```

   ```tsx for="solid" label="routes.tsx"
   const PEOPLE: Record<string, string> = { ada: 'Ada Park', mo: 'Mo Reyes' };

   export const routes = {
     name: 'home',
     layout: Layout,
     index: {
       path: '/',
       view: () => (
         <>
           <h1>Team</h1>
           <p>Pick a team member above.</p>
         </>
       ),
     },
     routes: {
       member: {
         path: '/people/:userId',
         view: (props) => <h1>{PEOPLE[props.params.userId]}</h1>,
       },
     },
   };
   ```

   - **`index`** renders inside `Layout` when the URL is `'/'` and shares `name: 'home'` with the root route, so `href('home')` produces `'/'`.
   - **`routes`** maps each key (`member`) to a named child route. Dynamic `:userId` segments are decoded and passed to your view as `params.userId`.

4. **Mount and start the router**

   Pass `mount: '#app'` and your route options to [`router()`](/api/router/#router), then await [`app.start()`](/api/router/#start):

   ```js for="core" label="app.js"
   import { router } from 'nav-router';
   import { routes } from './routes.js';

   const app = router({
     mount: '#app',
     ...routes,
   });

   await app.start();
   ```

   ```jsx for="react" label="app.jsx"
   import { router } from '@nav-router/react';
   import { routes } from './routes.jsx';

   const app = router({
     mount: '#app',
     ...routes,
   });

   await app.start();
   ```

   ```tsx for="solid" label="app.tsx"
   import { router } from '@nav-router/solid';
   import { routes } from './routes.tsx';

   const app = router({
     mount: '#app',
     ...routes,
   });

   await app.start();
   ```

   `app.start()` renders the current URL into `#app` and begins intercepting same-origin links and Back/Forward navigation.
::::

:::tip[Reading props in Solid]{for="solid"}
Route props in `@nav-router/solid` are reactive getters. Read `props.params.userId` inside JSX rather than destructuring `{ params }` at the top of the component so switching from `/people/ada` to `/people/mo` updates the heading in place.
:::

## What happens when you click

Open the app in a browser and click **Ada**, then **Mo**, then press Back:

- **Shared layouts stay in place** — `<header>` mounts once while only the active page slot swaps between views.
- **History works automatically** — Back and Forward step through `/`, `/people/ada`, and `/people/mo` using native session history entries.

Edit and run this project directly in the [Your first router](/examples/first-router/) live example, or continue to [Routes and params](/guides/routes-and-params/) to add nested sections and typed parameters.
