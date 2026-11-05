---
title: Integrations, the Seams
description: What an integration sits on. The three view seams and their bag, placement, the context a view receives, the route's life, and the five primitives a reactive provider supplies. Read this and the code it names before building one.
date: 2026-11-04
---

# Integrations, the Seams

## What This Is

The page for whoever builds a view layer on the native router: Solid, React, Svelte, a web component library, or a house framework. The core renders nothing and holds no reactivity. An integration fills three seams for what appears and, when its views are reactive, supplies five primitives to the scaffold. Everything below is the contract, and the code it names is the truth where this page is short.

If this page and the code are not enough to build on, the seam is wrong and not you. Say where you stopped rather than working around it. That report is the review.

## The Layers

| layer | holds | file |
|---|---|---|
| `Router` | the platform, the page, the cascade (guards, data, titles), the route lifecycle, the settings. Nothing of a route's, nothing of a view's. `router.root` is the root route | `src/router.js` |
| `Route` | its data slice, its active life (an abort signal), its reactive runs, and what it shows under `rendered` | `src/route.js` |
| a plugin | nothing. `Router.extend(plugin, options)` calls `plugin(options, Router, Navigator)` once; a plugin wraps a moment on a prototype and calls through | `src/plugins/*` |
| the dom plugin | the native how for the three seams. The reference implementation of this page | `src/plugins/dom.js` |
| `ReactiveRouter` | the scaffold a reactive integration extends: the five primitives, slices as per-key stores, hooks in reactions | `src/reactive-router.js` |
| an integration | a class extending `Router` or `ReactiveRouter` that fills the seams, in its own package | `@nav-router/<name>` |

## A View, As the Core Sees It

Opaque. A route declares `layout`, `view` and `slots: { name: view }`; the router declares `statusViews: { loading, notFound, forbidden, error }`. Each is resolved once per navigation by `resolveView`: a value, a class, a function, a module's default export, a promise, or `lazy(() => import('./page.js'))`. The core never calls a view and never reads one. What a view is, and what calling it means, is the integration's.

## The Three Seams

On `Router`, no-ops in the core, each taking one bag:

```js
createView({ view, placement, context })             // returns the rendered view
updateView({ rendered, view, placement, context })   // returns rendered, or a new one
destroyView({ rendered })
```

- `view` is the declared thing, resolved.
- `rendered` is whatever `createView` returned: an element, a component, a dispose, a record of your own. The core stores it on the route under the key of the declaration it came from (`route.rendered.layout`, `route.rendered.view`, `route.rendered.slots[name]`) and hands it back. The core reads nothing of it but its identity.
- `placement` is `{ parent, slot }`. `parent` is the rendered layout this view hangs inside: the route's own layout for its slots and its view, otherwise the nearest ancestor's, and `null` for the mount. `slot` is a name, or `undefined` for the default slot. The core knows no element. Turning a placement into a place is the integration's, and the dom plugin shows the native reading: the `<slot>` or `<slot name>` inside the parent, the parent itself when it wrote none, the host when it projects.
- `context` is below.

Under the dom plugin every view lives in a region, the house's `DynamicRegion`: two empty text nodes, which serialize to nothing and have no box, a start at the place the plugin reads and an end after it, with whatever the view rendered between them, one node or many. The plugin reads a placement to the element it names, the mount's first child for the root and the end of the slot otherwise, and the rendered value it returns is the region, `{ target, start, end, dispose, update }`. Slots are found inside the range: a child placement's parent is a region, and the plugin walks the elements strictly between its anchors for the host when one projects, otherwise the first slot element of that name among them or inside one, so a fragment layout, header, slot and footer as siblings, works with no wrapper. `createView` takes one more key, `mount`, the door for a framework that mounts at a target and anchor: `createView({ view, placement, context, mount: (target, anchor) => dispose | { dispose, update } })`. `mount` is handed the target and the region's end as its insertion reference, Solid's `insert(target, result, anchor)` marker, Svelte's `mount(component, { target, anchor })`, Lit's `renderBefore`, so what it puts in stands between the anchors and is the region's, a root a condition swapped in later included. `updateView` tells a mounted view through its `update`, or an element with one of its own, and renders a plain view again into the same range, keeping its id and the focus inside it; `destroyView` disposes, removes the range and gives a slot its fallback back. React and Vue need a container and make their own element inside their `mount`, inserted before the anchor, which the region still owns. Placement, removal and the fallback are written once, in the plugin; the integration owns the mount and the update.

Under a shadow host the slot attribute is stamped on the range's elements at mount and again when the view is told, and that is all: a framework root that swaps its own shape inside a projected named slot between tells is not seen. One platform edge: a host assigns an empty text node to its unnamed slot, so a host whose named slot is filled while nothing fills its default slot hides that slot's fallback; in this router the default slot always holds the page or the status view.

What the seams can rely on:

1. **Order inside one moment.** Destroys run leaf to root, then creates and updates run root to leaf. A leaving leaf's view is destroyed before the next leaf's is created into the same slot. A slot is never filled twice.
2. **A layout that comes back different remounts what hung inside it.** When `updateView` returns a value other than the one it was handed for a layout, the route's own slots and view and every route below are destroyed and created again into the new one. Return the same value to keep the children.
3. **A view's life ends at `destroyView`, never at its route's signal.** Destroy runs before the route's signal aborts, inside the same moment.
4. **The leaf's view swaps in place when the page's view changes.** A status view taking a page view's place, or giving it back, is a destroy and a create at the same placement, never an update.
5. **Update is told, not re-created.** A route whose data moved is handed the same `rendered` with a fresh context. Nothing is created twice.
6. **A slot below wins.** A slot a route below declares is that route's to fill. The ancestor's content for it is destroyed when the override enters and created again when it leaves, with the ancestor's layout untouched. `null` or `false` is an explicit empty: nothing is created and the slot shows its own fallback.
7. **A navigation's settle and render are one synchronous moment.** The view-transitions plugin wraps `applyCascade` for that reason. A data move on the standing page renders outside it.

When they fire: at settle, for routes entering (`createView` for each declaration) and routes told (`updateView`); on a data move, for the moved route and the routes below it; on a status swap, for the leaf; on a slot crossing, for the owner's slot alone.

## The Context a View Receives

```js
{ params, query, user, route, router, page, data, slices, signal }
```

- `params` and `query` are the page's, typed as the route declared them.
- `data` is the plain merge of this route's slice and its ancestors'. A route below contributes nothing to it.
- `slices` is `[{ route, data, title }]` for this route and its ancestors, in chain order. Under `ReactiveRouter` each slice also carries `store`, its per-key cells.
- `signal` is the route's abort signal, its active life.
- `page` is the whole page: `{ route, url, params, query, chain, slices, data, views, view, status, title, titles, key, user, error }`. `page.views` is `[{ route, layout, view, slots }]` in chain order, what each route shows.

Under `ReactiveRouter`, `context.data` is a plain snapshot. `router.liveContext(context)` returns `{ context, update }`: the context made live, where `params`, `query`, `user` and `page` are the router's own cells, so a kept layout's reads stay current without the route being told, and `params.org` tracks `org` alone; `data` reads through the slices' own cells so one key moving wakes its reader alone; `slices` is the one cell per view and `update(next)` its write. An integration renders its view with the live context and hangs `update` where its rendered view is told; what it hands the view, props or anything else, is its own word. `router.params` and `router.query` are those same live objects, for anything outside a view that reads them. They are the scaffold's one Proxy, `liveObject(cells)`, a `get` trap over a plain target kept to the page's keys so enumeration stays exact and a key read before it lands still tracks; a provider with a native per-key object overrides `liveObject` and `writeLive` together.

A view is its own render root, so the host framework's context does not cross a slot: under Solid a `Provider` inside a layout's JSX puts its context on an owner below the layout's root, and the slot element the router fills has no owner, so a page's `useContext` cannot see it. A provider that must reach every view wraps the app above the router, and the state the routes and views share is module-scoped, signals and stores as the Solid example's `store.js`.

## The Route's Life

A route is created when a navigation's chain first includes it, updated when its slice moved or the data above it did, and destroyed when a chain no longer includes it. Three hooks on the route, in the template's shape:

```js
onCreated(context)    // the route is active, its views are rendered
onUpdated(context)    // its data or its ancestors' moved, its views were told
onDestroyed(context)  // its views are gone, its signal is about to abort
```

with `context` as `{ router, route, params, query, data, previous, abortSignal, abortController, timeout, interval }`. `timeout` and `interval` end with the route. The hooks cannot refuse anything. Refusal belongs to the crossing words, present tense and before the crossing: `permission` and `redirect` on the way in, `leave` on the way out through the confirm-leave plugin.

An integration that needs per-route setup overrides `onRouteCreated`, `onRouteUpdated` and `onRouteDestroyed` on the router and calls through. Whatever it keeps per route hangs on the route, never on the router.

## Reactivity: the Scaffold

`ReactiveRouter extends Router`. A provider supplies five primitives:

```js
createSignal(value, { equals })   // { get, set, peek }. set compares with equals, the comparator the scaffold hands it
                                  // from its equality table; an equal value wakes nobody
createReaction(fn)     // runs fn(isFirst) now, and again whenever what it read moves. returns the dispose
untrack(fn)            // runs fn reading nothing
batch(fn)              // runs fn with notifications held to the end
createStore(initial)   // { get(key), set(key, value), peek(key) }, a cell per key. built from createSignal by
                       // default; a provider with a native per-key store overrides it
```

Equality is the scaffold's, not the provider's. A data cell, a param, a query key or the user compares as the router's `dataChanged` setting says, the instance's one word on how data compares, deep by default. `ReactiveRouter.equality` is a static table for the two other kinds: `snapshot` by identity for `current`, `page`, `pending` and `error`, which carry routes and the router, and `slices` by their members. Every cell is created with its comparator; a provider's `createSignal` compares with what it is handed and never decides.

The router's own state is live under the scaffold: `current`, `page`, `pending`, `error` and `user` are cells behind the same fields, written by the core as always and tracked by whoever reads them, so `isActive`, `isCurrent`, `canAccess`, a loading bar on `router.pending` and breadcrumbs on `router.page.titles` are reactive with nothing wired. The navigator's readouts, `canGoBack` and the rest, read `current` first and are live with it. A page's write, its settle and its render are one batch, so a view sees the page and the chain move together.

One don't that follows. A hook's consequence runs untracked, because it reads the page before its first await inside the hook's own reaction, and the page is now a cell. The scaffold cannot see inside a hook's body: a `data` or `permission` function that reads `router.page` or `router.current` through its context subscribes to them and re-runs on every page, so a hook reads its context's `params`, `query`, `data` and `user`, never the router's state.

How the scaffold spends them. Every hook, `redirect`, `permission`, `data` and `title`, runs inside a reaction. The first run is the cascade's own pass, so nothing computes twice. A later run lands the way that hook lands at navigation: a redirect moves the page, a refused permission redirects or shows forbidden, data writes its slice key by key through the store, a title updates its title. A slice is a store, and merged data reads each key through its cell, so a key that moved wakes only the functions that read it. There is no deep compare anywhere: the cell's equality is the one compare, and the cell is read back to learn whether it moved.

Born and adopt, in one paragraph. A run born while its navigation is in flight belongs to that navigation: it runs under the navigation's signal and lands nothing on the standing page, holding its latest value instead. At settle the route adopts the runs born for it, flushes a held value, and from then on the run belongs to the route and ends with the route's signal. A run nobody adopted at settle belonged to a branch the navigation abandoned and is stopped. A route's runs live on `route.runs`.

## What an Integration Must Not Do

- Keep a second record of views keyed by route. `route.rendered` is the record.
- Read the document from the core's side, or ask the core for an element. Placement is abstract on purpose.
- End a view at the route's signal. `destroyView` is the end.
- Compare data deeply. The cell does it once.
- Add a method or field on the router that shares a name with a key in `Router.defaults`, or on a route that shares a name with a field `Route` sets. The preload plugin broke that way once.
- Hang per-route state on the router. The route holds its own.

## A Sketch

A reactive integration whose views render themselves from signals, so update is a signal write and the rendered value never changes:

```js
import { ReactiveRouter } from 'nav-router/reactive';

export class MyRouter extends ReactiveRouter {
  createSignal(value, { equals }) { /* the framework's, comparing with equals */ }
  createReaction(fn) { /* the framework's; return the dispose */ }
  untrack(fn) { /* the framework's */ }
  batch(fn) { /* the framework's */ }

  createView({ view, placement, context }) {
    const [getContext, setContext] = this.createSignal(context, { equals: Object.is });
    const target = placeOf(placement);                       // your reading of { parent, slot }
    const dispose = mount(() => view(getContext()), target);  // the framework's render into an element
    return { element: target, setContext, dispose };          // whatever you need back; the core keeps it for you
  }

  updateView({ rendered, context }) {
    rendered.setContext(context);
    return rendered;                                          // same value: children stay
  }

  destroyView({ rendered }) {
    rendered.dispose();
  }
}
```

`placement.parent` here is the `rendered` your `createView` returned for the layout above, so `placeOf` reads `parent.element` and finds the slot inside it, or the mount when `parent` is `null`.

## Measuring

The house's three numbers are the core with utils bundled, the core with utils external, and the scaffold with its dependencies external. An integration measures itself the same way, beside the framework it joins, and reports the number with the commit.

## Where to Stop

Stop and say so when a placement lacks what you need, a context lacks a field, the seams fire in an order that contradicts the rules above, or the identity compare on `rendered` is wrong for your views. Each of those is the seam's defect to fix in the core, not yours to absorb.
