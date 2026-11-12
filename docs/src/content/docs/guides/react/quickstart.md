---
title: Quickstart
lede: This guide walks through installing `@nav-router/react` and rendering your first layout and page routes.
updated: 2026-11-12
---

`@nav-router/react` connects `nav-router` to React 19+ components without wrapping your app in a top-level provider or custom link components.

:::steps
1. **Install the packages.** Add `nav-router` and `@nav-router/react` alongside `react` and `react-dom` (`19` or later):

   ```sh
   npm install nav-router @nav-router/react
   ```

2. **Write a root layout.** A layout is a plain React component that renders `{children}` where the active page belongs. Build URLs with [`href()`](/api/router/#href) on standard `<a>` elements:

   ```jsx title="src/Layout.jsx"
   import { href } from '@nav-router/react';

   export function AppLayout({ children }) {
     return (
       <div className="app">
         <header>
           <nav>
             <a href={href('home')}>Home</a>
             <a href={href('post', { slug: 'hello-world' })}>Hello World</a>
           </nav>
         </header>
         <main>{children}</main>
       </div>
     );
   }
   ```

   Same-origin `<a>` clicks are intercepted automatically through the browser Navigation API, so you never need a custom `<Link>` component.

3. **Write your page components.** Each route's `view` receives resolved `data` and URL `params` as props once loading completes:

   ```jsx title="src/pages.jsx"
   export function Home() {
     return <h1>Recent posts</h1>;
   }

   export function Post({ params, data }) {
     return (
       <article>
         <h1>{data.post.title}</h1>
         <p className="slug">/{params.slug}</p>
         <div>{data.post.body}</div>
       </article>
     );
   }
   ```

4. **Create and start the router.** Import `router` from `@nav-router/react` to connect your layout and routes, then call `await app.start()` against a mount element in your HTML (such as `<div id="app"></div>`):

   ```jsx title="src/main.jsx"
   import { router } from '@nav-router/react';
   import { AppLayout } from './Layout.jsx';
   import { Home, Post } from './pages.jsx';

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

   `app.start()` matches the current browser URL, runs `data` when the matched route defines it, mounts `AppLayout` into `#app`, and resolves once the initial page renders. Navigating between `/` and `/blog/hello-world` keeps `AppLayout` mounted and swaps only `{children}`.
:::

## Next steps

- **[Components and hooks](/guides/react/components/)** — share React Context across nested layouts and subscribe to router state with `useRouter()`.
- **[Loading data](/guides/loading-data/)** — share parent layout data with child routes and handle `404` responses.
- **[`@nav-router/react` API](/api/react/)** — reference for `ReactRouter`, `useRouter()`, and `ReactView`.
