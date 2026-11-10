import { each, inArray, isFunction, isPromise, isString, noop } from '@semantic-ui/utils';

import { Router } from './router.js';

// the scaffolding every reactive provider would otherwise repeat. each hook runs inside the
// provider's reaction, learning its dependencies on the cascade's first pass without computing
// twice. when something it read moves, a later run lands the way that hook lands at navigation:
// a redirect moves the page, a refused permission redirects or shows forbidden, data updates its
// entry, and a title updates its title. an active route's data is a store with a cell per key, and merged data
// reads each key through its cell, so a key that moved wakes only the functions that read it, the
// cell's own equality deciding what moved. a route holds its runs, and a run made while its
// navigation is in flight belongs to that navigation until it is attached to the route at settle: it ends
// with the navigation's signal before, and with the route's after. a provider supplies the four
// primitives below; the fifth, the per-key store, is built from signals unless the provider has a
// native one ($state, a store, reactive())
export class ReactiveRouter extends Router {
  // the comparator for each kind of cell the scaffold makes, on the class as Signal.equality is so
  // a provider or an app overrides it once: a data key, a param, a query key or the user compares
  // deep, the active routes by their members since the router builds that array fresh at every update,
  // and the page by identity since it carries the route and the router, which a walk would enter
  static equality = {
    // a snapshot carries routes and the router, which a walk would enter: current, page, pending, error
    snapshot: Object.is,
    // the router builds a view's active routes array fresh at every update; the same ones in it are the same
    activeRoutes: (a, b) => a.length === b.length && a.every((activeRoute, index) => activeRoute === b[index]),
  };

  constructor(options) {
    super(options);
    // a tracked page is live; a cached result would not be
    this.entryCache = null;
    // the runs the navigation in flight made and not yet attached to a route
    this.pendingRuns = [];
    // the router's own state as cells, so whatever reads current, page, pending, error or user is live,
    // the helpers and an app's chrome among them. core writes the fields as it always has
    const { equality } = this.constructor;
    each(['current', 'page', 'pending', 'error'], (key) => this.defineCell(key, equality.snapshot));
    this.defineCell('user', (a, b) => !this.config.dataChanged(a, b));
    // the page's params and query, live by key: params.org tracks org alone. the page's and so the
    // router's, written once per settle, which is what keeps a kept layout's reads current
    this.paramCells = this.createStore({});
    this.queryCells = this.createStore({});
    this.params = this.liveObject(this.paramCells);
    this.query = this.liveObject(this.queryCells);
  }

  // the keys of a page written to their cells, and the plain object under the live one kept to
  // the page's keys, so what it enumerates is exact
  writeLive(live, cells, values) {
    each(Object.keys(live), (key) => {
      if (!(key in values)) {
        delete live[key];
        cells.set(key, undefined);
      }
    });
    each(values, (value, key) => {
      live[key] = value;
      cells.set(key, value);
    });
  }

  // an object read live by key, every string key through its cell: a key the page does not hold
  // yet tracks too, so a layout on / that reads params.org wakes when /team/acme lands. the one
  // proxy in the scaffold, for what a view would otherwise reach through a get(key); a provider
  // with a native per-key object overrides it with writeLive
  liveObject(cells) {
    return new Proxy({}, {
      get: (target, key) => (isString(key) && !(key in Object.prototype) ? cells.get(key) : target[key]),
    });
  }

  // a field of the router backed by a cell: the write is the field's, the read tracks it
  defineCell(key, equals) {
    const cell = this.createSignal(this[key], { equals });
    Object.defineProperty(this, key, { get: cell.get, set: cell.set, enumerable: true, configurable: true });
  }

  // the navigator's readouts move when the current entry does, so reading current first makes them live
  get canGoBack() {
    return !!this.current && this.navigator.canGoBack;
  }

  get canGoForward() {
    return !!this.current && this.navigator.canGoForward;
  }

  get entry() {
    return this.current && this.navigator.entry;
  }

  get entries() {
    return this.current ? this.navigator.entries : [];
  }

  get transition() {
    return this.pending && this.navigator.transition;
  }

  /*******************************
              Moments
  *******************************/

  // identity as a function runs for the router's life, so the user moves on the standing page as it
  // does at a navigation, and a guard that read it lands where the navigation's own read would.
  // a navigation uses the reaction's read while it is in flight and no navigation has, the
  // boot's among them, and asks again otherwise, once per navigation as core does: an identity
  // reading nothing reactive, a cookie or a fetch, still moves with the page
  async start() {
    if (isFunction(this.config.identity)) {
      this.abortController = new AbortController();
      this.stopIdentity = this.createReaction(() => {
        this.hasNewIdentity = true;
        this.readIdentity({ signal: this.abortController.signal, reload: false, previous: null });
      });
    }
    return super.start();
  }

  stop() {
    this.stopIdentity?.();
    this.stopIdentity = null;
    this.identityPromise = null;
    this.abortController?.abort();
    // an unresolved route has no signal to end its runs, so the page's watch ends here
    this.pageAbort?.abort();
    each(this.page?.unresolvedRoutes ?? [], ({ route }) => this.stopRuns(route));
    return super.stop();
  }

  resolveIdentity(navigation) {
    if (!this.stopIdentity) {
      return super.resolveIdentity(navigation);
    }
    const pendingIdentity = !navigation.reload && this.hasNewIdentity && this.identityPromise;
    this.hasNewIdentity = false;
    return pendingIdentity || this.readIdentity(navigation);
  }

  // the user is set only while the read is still the latest and what started it still stands, the
  // navigation's signal or the router's own, so a slower older read never lands over a newer one
  // and an aborted navigation's lands nothing. settled, it is no navigation's to take; failed, it
  // is dropped, so the navigation that awaited it fails with it and the next asks again
  readIdentity(context) {
    const promise = Promise.resolve(this.config.identity(context)).then((user) => {
      if (this.identityPromise === promise && !context.signal?.aborted) {
        this.user = user ?? null;
      }
    });
    this.identityPromise = promise;
    promise.then(() => {
      if (this.identityPromise === promise) {
        this.hasNewIdentity = false;
      }
    }, () => {
      if (this.identityPromise === promise) {
        this.identityPromise = null;
      }
    });
    return promise;
  }

  /*******************************
            Provider
  *******************************/

  // { get, set, peek }, equal values leaving dependents alone. equals is the cell's comparator, handed
  // by the scaffold from its equality table, so a provider's own default never decides
  createSignal(initialValue, { equals } = {}) {
    throw new Error('ReactiveRouter: a provider supplies createSignal(value, { equals })');
  }

  // runs fn(isFirst) now and again whenever what it read moves; returns the dispose
  createReaction(fn) {
    throw new Error('ReactiveRouter: a provider supplies createReaction(fn)');
  }

  untrack(fn) {
    return fn();
  }

  batch(fn) {
    return fn();
  }

  // { get(key), set(key, value), peek(key) }: a cell per key, made on first touch. a provider with a
  // native per-key object overrides it
  createStore(initialValue = {}) {
    const cells = new Map();
    const cell = (key) => {
      if (!cells.has(key)) {
        // a data cell compares as the router's dataChanged says, the instance's word on data
        cells.set(
          key,
          this.createSignal(initialValue[key], { equals: (a, b) => !this.config.dataChanged(a, b) }),
        );
      }
      return cells.get(key);
    };
    return {
      get: (key) => cell(key).get(),
      set: (key, value) => cell(key).set(value),
      peek: (key) => cell(key).peek(),
    };
  }

  // the view's context made live, for an integration to render with. params, query, user and page
  // are the router's own cells, so a kept layout's reads stay current without the route being told;
  // data reads through the active routes' own cells, so one key moving wakes its reader alone; the active routes are
  // the one cell per view, and update is its write, for an integration to hang where its rendered
  // view is told. what it hands the view, props or anything else, is its own word
  liveContext(context) {
    const router = this;
    // a loading view is rendered over the standing page, which the router's cells still hold, so
    // it reads its own page as a snapshot, the user live
    if (context.page !== this.page) {
      return {
        context: {
          ...context,
          get user() {
            return router.user;
          },
        },
        update: noop,
      };
    }
    const activeRoutes = this.createSignal(context.activeRoutes, { equals: this.constructor.equality.activeRoutes });
    // the merged data is built once per active routes array, the cells inside it doing the tracking
    let cachedRoutes = null;
    let cachedData = null;
    const live = {
      route: context.route,
      router,
      signal: context.signal,
      params: this.params,
      query: this.query,
      get user() {
        return router.user;
      },
      get page() {
        return router.page;
      },
      get activeRoutes() {
        return activeRoutes.get();
      },
      get data() {
        const current = activeRoutes.get();
        if (current !== cachedRoutes) {
          cachedRoutes = current;
          cachedData = router.dataFor(current);
        }
        return cachedData;
      },
    };
    return { context: live, update: (next) => activeRoutes.set(next.activeRoutes) };
  }

  // merges ancestor active routes behind per-key getters, so reading data.team tracks team's cell alone.
  // a getter exists for the keys an active route holds, so a key a run returns only sometimes is read plain
  // on the runs it is absent: a data() returns every key every run, undefined when it has none
  dataFor(activeRoutes) {
    const data = {};
    each(activeRoutes, (activeRoute) => {
      each(activeRoute.data, (_, key) => {
        Object.defineProperty(data, key, {
          get: () => (activeRoute.store ? activeRoute.store.get(key) : activeRoute.data[key]),
          enumerable: true,
          configurable: true,
        });
      });
    });
    return data;
  }

  /*******************************
           Active Routes
  *******************************/

  createActiveRoute(route, data) {
    const activeRoute = super.createActiveRoute(route, data);
    activeRoute.store = this.createStore(data);
    return activeRoute;
  }

  // every key is written through its cell, whose own equality is the one compare, and what the cell
  // holds afterwards says whether it moved. the plain mirror is written first so a synchronous
  // reaction reads the new value through either door
  setRouteData(activeRoute, data) {
    const previous = activeRoute.data;
    let moved = false;
    activeRoute.data = data;
    this.batch(() => {
      each({ ...previous, ...data }, (_, key) => {
        const before = activeRoute.store.peek(key);
        activeRoute.store.set(key, data[key]);
        moved ||= !Object.is(activeRoute.store.peek(key), before);
      });
    });
    return moved;
  }

  /*******************************
               Hooks
  *******************************/

  // runs fn inside the provider's reaction and hands each later run's value to changed. the signal
  // the hook was given is the life its run belongs to: the navigation's while one is in flight, the
  // route's own when the standing page runs it. what the function reads of the active routes above it is
  // its own dependency, through the data the provider makes readable
  evaluateHook(route, fn, context, { kind, changed }) {
    if (!isFunction(fn)) {
      return fn;
    }
    const { signal, activeRoutes } = context;
    let first;
    // what the hook sees of the user is live, a getter on its own context, so a guard that read it
    // runs again when the user moves and a hook that did not read it is left alone
    const createHookContext = (extra) =>
      Object.defineProperty({ ...context, data: this.dataFor(activeRoutes), ...extra }, 'user', {
        get: () => this.user,
        enumerable: true,
      });
    // a run under the route's own signal is the route's from the start; one under a navigation's
    // is the navigation's until it is attached to the route at settle
    const run = { kind, route, changed, latest: null, attached: signal === route.abortSignal };
    run.stop = this.createReaction((isFirst) => {
      if (isFirst) {
        first = fn(createHookContext({}));
        return;
      }
      // a run the navigation in flight made runs under that navigation's signal and lands nothing on
      // the standing page, whose route may be the same one: its latest value waits until it is
      // attached. a later run that throws is a rejected promise, applied as one
      let value;
      try {
        value = fn(createHookContext({ signal: run.attached ? this.getSignal(route) : signal }));
      }
      catch (error) {
        value = Promise.reject(error);
      }
      if (isPromise(value)) {
        value.catch(noop);
      }
      if (!run.attached) {
        run.latest = { value };
        return;
      }
      if (this.onPage(route)) {
        this.applyHookResult(route, changed, value);
      }
    });
    if (run.attached) {
      (route.runs ??= new Set()).add(run);
    }
    else {
      signal?.addEventListener('abort', () => {
        if (!run.attached) {
          run.stop();
          // its navigation is gone, so nothing of it waits to be attached
          this.pendingRuns = this.pendingRuns.filter((other) => other !== run);
        }
      }, { once: true });
      this.pendingRuns.push(run);
    }
    return first;
  }

  stopRuns(route, kind = null) {
    each([...(route.runs ?? [])], (run) => {
      if (kind === null || run.kind === kind) {
        run.stop();
        route.runs.delete(run);
      }
    });
  }

  // the runs the settled navigation made for the route replace the ones it had, by kind: a kept
  // route keeps its data runs and attaches only its new guard runs, which ran this navigation
  attachRuns(route, kind = null) {
    const routeRuns = this.pendingRuns.filter((run) => run.route === route && (kind === null || run.kind === kind));
    this.pendingRuns = this.pendingRuns.filter((run) => !inArray(run, routeRuns));
    this.stopRuns(route, kind);
    each(routeRuns, (run) => {
      run.attached = true;
      (route.runs ??= new Set()).add(run);
      if (run.latest) {
        this.applyHookResult(route, run.changed, run.latest.value);
      }
    });
  }

  // a later value applied to the standing page through its consequence, untracked since a
  // consequence reads the page before its first await and the page is a cell. a run aborted at its
  // route's teardown and a route since gone say nothing; a failure is logged with the page kept,
  // since the entry the route had still stands
  applyHookResult(route, changed, value) {
    const onError = (error) => {
      if (error?.name !== 'AbortError' && this.onPage(route)) {
        this.logError(error);
      }
    };
    try {
      Promise.resolve(this.untrack(() => changed(value))).catch(onError);
    }
    catch (error) {
      onError(error);
    }
  }

  // after settle nothing is left pending: a run no route attached belonged to a branch this navigation
  // abandoned, a precommit redirect's first routes among them
  settleRoutes(previous, page, { inPlace = false } = {}) {
    this.writeLive(this.params, this.paramCells, page.params ?? {});
    this.writeLive(this.query, this.queryCells, page.query ?? {});
    // in place, the standing page settled again with a refusal or a not-found landing on it: the
    // route it landed on is no longer active, and keeps its runs across the end of its life so the
    // one that watches for the refusal lifting still does
    const refused = page.unresolvedRoutes?.[0]?.route;
    const kept = inPlace && refused?.runs;
    if (kept) {
      refused.runs = null;
    }
    this.changedRoutes = new Set();
    super.settleRoutes(previous, page);
    if (kept) {
      refused.runs = kept;
    }
    if (!inPlace) {
      this.pageAbort?.abort();
      this.pageAbort = new AbortController();
      each(page.activeRoutes ?? [], ({ route }) => {
        if (!this.changedRoutes.has(route)) {
          this.attachRuns(route, 'guard');
        }
      });
      // an unresolved route's runs are the page's: they watch for it to resolve, and end with the page
      each(page.unresolvedRoutes ?? [], ({ route }) => this.attachRuns(route));
      each(this.pendingRuns, (run) => run.stop());
      this.pendingRuns = [];
    }
    each(previous?.unresolvedRoutes ?? [], ({ route }) => {
      if (!inArray(route, this.matchedRoutes(page))) {
        this.stopRuns(route);
      }
    });
    this.changedRoutes = null;
  }

  // the signal a hook's later run is handed: its route's while it is active, and for an unresolved
  // route, which has no life of its own, one that lives as long as the page it waits on
  getSignal(route) {
    return route.active ? route.abortSignal : this.pageAbort?.signal;
  }

  // a hook's later value lands while its route is on the standing page, active or waiting
  // unresolved. untracked: the page is a cell, and a hook that depended on it would run again at
  // every page its own consequence wrote
  onPage(route) {
    return route.active
      || this.untrack(() => this.page?.unresolvedRoutes?.some((unresolved) => unresolved.route === route));
  }

  onRouteCreated(route, context) {
    route.abortSignal.addEventListener('abort', () => this.stopRuns(route), { once: true });
    this.changedRoutes?.add(route);
    this.attachRuns(route);
    return super.onRouteCreated(route, context);
  }

  onRouteUpdated(route, context) {
    this.changedRoutes?.add(route);
    this.attachRuns(route);
    return super.onRouteUpdated(route, context);
  }
}
