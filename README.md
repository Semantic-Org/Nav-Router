# <img alt="" src=".github/logo.svg" height="47" align="absmiddle"> Nav Router

> A thin router built on the browser's Navigation API

- One route tree for paths, params, guards, data and views
- Typed params and query, coerced before your code reads them
- Nested layouts and named slots
- Lazy views, loaded with their route
- Plugins you import only if you use them
- About 12 KB brotli, with no framework required

Nav Router leaves navigation to the platform. The browser's [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) intercepts links, history, focus and scroll, and the router adds what an app declares on top: which route a URL matches, who may enter it, what data it loads and what it shows.

```js
import { lazy, router } from 'nav-router';

export const app = router({
  title: 'Acme',
  layout: RootLayout,
  index: { path: '/', view: HomePage },
  routes: {
    team: {
      path: '/team/:org',
      layout: TeamLayout,
      data: ({ params, signal }) => api.team(params.org, { signal }),
      routes: {
        members: {
          path: '/team/:org/members',
          view: lazy(() => import('./members.js')),
        },
        settings: {
          path: '/team/:org/settings',
          permission: ({ user }) => user?.role === 'admin',
          view: SettingsPage,
        },
      },
    },
  },
});

app.start();
```

[Read the Docs to Learn More](https://navrouter.dev).

## Packages

| Package | Description |
| --- | --- |
| [nav-router](src) | The router and the reactive scaffold integrations build on |
| [@nav-router/plugins](packages/plugins) | The plugins, each installed by importing it |
| [@nav-router/solid](integrations/solid) | Nav Router for Solid |
| [@nav-router/svelte](integrations/svelte) | Nav Router for Svelte |
| [@nav-router/core](packages/core) | The router under its scoped name, a thin re-export |

## Examples

Each example is a small Vite app. Install once at the root, then run one by name.

```sh
npm install
npm run flat     # a flat route table
npm run nested   # nested layouts and slots
npm run solid    # the same app as Solid components
npm run svelte   # the same app as Svelte components
```

## License

[ISC](LICENSE)
