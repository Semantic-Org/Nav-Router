---
title: Quickstart
lede: This guide walks through installing `@nav-router/solid` and building your first reactive layout and page routes.
updated: 2026-11-12
---

`@nav-router/solid` connects `nav-router` to Solid's fine-grained signals, mounting route components once and updating `props` in place as you navigate.

:::steps
1. **Install the packages.** Add `nav-router` and `@nav-router/solid` alongside `solid-js` (`1.9` or later):

   ```sh
   npm install nav-router @nav-router/solid
   ```

2. **Write a root layout.** Layouts are Solid components that place a `<slot />` element where child views render. Build URLs with [`href()`](/api/router/#href) on standard `<a>` elements:

   ```tsx title="src/Layout.tsx"
   import { href, isActive } from '@nav-router/solid';

   export function AppLayout() {
     return (
       <div class="app">
         <header>
           <nav>
             <a href={href('home')}>Home</a>
             <a
               href={href('post', { slug: 'hello-world' })}
               aria-current={isActive('post') ? 'page' : undefined}
             >
               Blog
             </a>
           </nav>
         </header>
         <main>
           <slot />
         </main>
       </div>
     );
   }
   ```

   Same-origin `<a>` clicks are intercepted through the browser Navigation API, and helpers like [`isActive()`](/api/is-active/) track reactively inside Solid JSX without extra hooks.

3. **Write your page components.** Each route's `view` receives a reactive `props` object carrying `props.params` and `props.data`:

   ```tsx title="src/pages.tsx"
   export function Home() {
     return <h1>Recent posts</h1>;
   }

   export function Post(props) {
     return (
       <article>
         <h1>{props.data.post.title}</h1>
         <p class="slug">/{props.params.slug}</p>
         <div>{props.data.post.body}</div>
       </article>
     );
   }
   ```

   Read `props.data` and `props.params` inside JSX rather than destructuring `props` in the function signature so Solid updates only those DOM nodes when `:slug` changes.

4. **Create and start the router.** Import `router` from `@nav-router/solid` to connect your layout and routes, then call `await app.start()` against a mount element in your HTML (such as `<div id="app"></div>`):

   ```tsx title="src/main.tsx"
   import { router } from '@nav-router/solid';
   import { AppLayout } from './Layout.tsx';
   import { Home, Post } from './pages.tsx';

   const app = router({
     mount: '#app',
     layout: AppLayout,
     index: {
       name: 'home',
       view: Home,
     },
     routes: [
       {
         name: 'post',
         path: '/blog/:slug',
         async data({ params, signal }) {
           const res = await fetch(`/api/posts/${params.slug}`, { signal });
           return { post: await res.json() };
         },
         view: Post,
       },
     ],
   });

   await app.start();
   ```

   `app.start()` matches the initial browser URL, loads `data`, mounts `AppLayout` into `#app`, and resolves once the first page renders.
:::

## Next steps

- **[Views and props](/guides/solid/views/)** — learn how per-key reactive props and `<slot>` outlets work in Solid views.
- **[Reactive state](/guides/solid/state/)** — track Solid signals inside `data` and `permission` hooks and read live router fields in JSX.
- **[`@nav-router/solid` API](/api/solid/)** — reference for `SolidRouter` and `SolidView`.
