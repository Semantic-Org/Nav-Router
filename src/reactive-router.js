import { each, inArray, isFunction, isPromise, isString, noop } from '@semantic-ui/utils';

import { Router } from './router.js';

// the scaffolding every reactive provider would otherwise repeat. each hook runs inside the
// provider's reaction, learning its dependencies on the cascade's first pass without computing
// twice. when something it read moves, a later run lands the way that hook lands at navigation:
// a redirect moves the page, a refused permission redirects or shows forbidden, data updates its
// slice, and a title updates its title. a slice is a store with a cell per key, and merged data
// reads each key through its cell, so a key that moved wakes only the functions that read it, the
// cell's own equality deciding what moved. a route holds its runs, and a run born while its
// navigation is in flight belongs to that navigation until the route adopts it at settle: it ends
// with the navigation's signal before, and with the route's after. a provider supplies the four
// primitives below; the fifth, the per-key store, is built from signals unless the provider has a
// native one ($state, a store, reactive())
export class ReactiveRouter extends Router {
  // the comparator for each kind of cell the scaffold makes, on the class as Signal.equality is so
  // a provider or an app overrides it once: a data key, a param, a query key or the user compares
  // deep, the slices by their members since the router builds that array fresh at every update,
  // and the page by identity since it carries the route and the router, which a walk would enter
  static equality = {
    // a snapshot carries routes and the router, which a walk would enter: current, page, pending, error
    snapshot: Object.is,
    // the router builds a view's slices array fresh at every update; the same slices in it are the same
    slices: (a, b) => a.length === b.length && a.every((slice, index) => slice === b[index]),
  };

  constructor(options) {
    super(options);
    // a tracked page is live; a cached result would not be
    this.entryCache = null;
    // the runs the navigation in flight has born and no route has adopted yet
    this.born = [];
    // the router's own state as cells, so whatever reads current, page, pending, error or user is live,
    // the helpers and an app's chrome among them. core writes the fields as it always has
    const { equality } = this.constructor;
    each(['current', 'page', 'pending', 'error'], (key) => this.cellFor(key, equality.snapshot));
    this.cellFor('user', (before, after) => !this.dataChanged(before, after));
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
  cellFor(key, equals) {
    const cell = this.createSignal(this[key], { equals });
    Object.defineProperty(this, key, { get: cell.get, set: cell.set, enumerable: true, configurable: true });
  }

  // the navigator's readouts move when the current entry does, so reading current first makes them live
  get canGoBack() {
    return this.current && this.navigator.canGoBack;
  }

  get canGoForward() {
    return this.current && this.navigator.canGoForward;
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
  // does at a navigation, and a guard that read it lands where the navigation's own answer would.
  // a navigation takes the reaction's answer while no navigation has, the boot's among them, and
  // asks again otherwise, once per navigation as core does: an identity reading nothing reactive,
  // a cookie or a fetch, still moves with the page
  async start() {
    if (isFunction(this.identity)) {
      this.lifetime = new AbortController();
      this.identityRun = this.createReaction(() => {
        this.identityFresh = true;
        this.askIdentity({ signal: this.lifetime.signal, reload: false, previous: null });
      });
    }
    return super.start();
  }

  stop() {
    this.identityRun?.();
    this.identityRun = null;
    this.identityAnswer = null;
    this.lifetime?.abort();
    return super.stop();
  }

  resolveIdentity(navigation) {
    if (!this.identityRun) {
      return super.resolveIdentity(navigation);
    }
    const fresh = this.identityFresh && this.identityAnswer;
    this.identityFresh = false;
    return fresh || this.askIdentity(navigation);
  }

  // the answer lands only while it is still the latest and the lifetime stands, so a slower older
  // answer never lands over a newer one; a failed answer is dropped, so the navigation that awaited
  // it fails with it and the next asks again
  askIdentity(context) {
    const answer = Promise.resolve(this.identity(context)).then((user) => {
      if (this.identityAnswer === answer && !this.lifetime.signal.aborted) {
        this.user = user ?? null;
      }
    });
    this.identityAnswer = answer;
    answer.catch(() => {
      if (this.identityAnswer === answer) {
        this.identityAnswer = null;
      }
    });
    return answer;
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
          this.createSignal(initialValue[key], { equals: (before, after) => !this.dataChanged(before, after) }),
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

  // merges ancestor slices behind per-key getters, so reading data.team tracks team's cell alone.
  // a getter exists for the keys a slice holds, so a key a run returns only sometimes is read plain
  // on the runs it is absent: a data() returns every key every run, undefined when it has none
  // the view's context made live, for an integration to render with. params, query, user and page
  // are the router's own cells, so a kept layout's reads stay current without the route being told;
  // data reads through the slices' own cells, so one key moving wakes its reader alone; the slices are
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
    const slices = this.createSignal(context.slices, { equals: this.constructor.equality.slices });
    // the merged data is built once per slices array, the cells inside it doing the tracking
    let builtFor = null;
    let built = null;
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
      get slices() {
        return slices.get();
      },
      get data() {
        const current = slices.get();
        if (current !== builtFor) {
          builtFor = current;
          built = router.dataFor(current);
        }
        return built;
      },
    };
    return { context: live, update: (next) => slices.set(next.slices) };
  }

  dataFor(slices) {
    const data = {};
    each(slices, (slice) => {
      each(slice.data, (_, key) => {
        Object.defineProperty(data, key, {
          get: () => (slice.store ? slice.store.get(key) : slice.data[key]),
          enumerable: true,
          configurable: true,
        });
      });
    });
    return data;
  }

  /*******************************
              Slices
  *******************************/

  sliceOf(route, data) {
    const slice = super.sliceOf(route, data);
    slice.store = this.createStore(data);
    return slice;
  }

  // every key is written through its cell, whose own equality is the one compare, and what the cell
  // holds afterwards says whether it moved. the plain mirror is written first so a synchronous
  // reaction reads the new value through either door
  setSlice(slice, data) {
    const previous = slice.data;
    let moved = false;
    slice.data = data;
    this.batch(() => {
      each({ ...previous, ...data }, (_, key) => {
        const before = slice.store.peek(key);
        slice.store.set(key, data[key]);
        moved ||= !Object.is(slice.store.peek(key), before);
      });
    });
    return moved;
  }

  /*******************************
               Hooks
  *******************************/

  // runs fn inside the provider's reaction and hands each later run's value to changed. the signal
  // the hook was given is the life its run belongs to: the navigation's while one is in flight, the
  // route's own when the standing page runs it. what the function reads of the slices above it is
  // its own dependency, through the data the provider makes readable
  evaluateHook(route, fn, context, { kind, changed }) {
    if (!isFunction(fn)) {
      return fn;
    }
    const { signal, slices } = context;
    let first;
    let born = null;
    // what the hook sees of the user is live, a getter on its own bag, so a guard that read it runs
    // again when the user moves and a hook that did not read it is left alone
    const bagFor = (extra) => {
      const bag = { ...context, data: this.dataFor(slices), ...extra };
      Object.defineProperty(bag, 'user', { get: () => this.user, enumerable: true });
      return bag;
    };
    const stop = this.createReaction((isFirst) => {
      if (isFirst) {
        first = fn(bagFor({}));
        return;
      }
      const unadopted = born && !born.adopted;
      // a run born for a navigation in flight runs under that navigation's signal and lands nothing on
      // the standing page, whose route may be the same one: its latest value waits for adopt
      const value = fn(bagFor({ signal: unadopted ? signal : route.abortSignal }));
      if (unadopted) {
        if (isPromise(value)) {
          value.catch(noop);
        }
        born.latest = { value };
        return;
      }
      if (route.active) {
        // untracked: a consequence reads the page before its first await, and the page is a cell
        this.untrack(() => changed(value));
      }
    });
    const run = { stop, kind };
    if (signal === route.abortSignal) {
      (route.runs ??= new Set()).add(run);
    }
    else {
      born = { route, run, adopted: false, changed, latest: null };
      signal?.addEventListener('abort', () => {
        if (!born.adopted) {
          stop();
          // its navigation is gone, so nothing of it waits for adopt
          this.born = this.born.filter((other) => other !== born);
        }
      }, { once: true });
      this.born.push(born);
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

  // the runs born for the route in the navigation that settled replace the last run's, by kind: a
  // kept route keeps its slice runs and takes only its new guard runs, which ran this navigation
  adopt(route, kind = null) {
    const mine = this.born.filter((born) => born.route === route && (kind === null || born.run.kind === kind));
    this.born = this.born.filter((born) => !inArray(born, mine));
    this.stopRuns(route, kind);
    each(mine, (born) => {
      born.adopted = true;
      (route.runs ??= new Set()).add(born.run);
      if (born.latest) {
        this.untrack(() => born.changed(born.latest.value));
      }
    });
  }

  // after settle nothing is left unborn: what was not adopted belonged to a branch this navigation
  // abandoned, a precommit redirect's first chain among them
  settleRoutes(previous, page) {
    this.writeLive(this.params, this.paramCells, page.params ?? {});
    this.writeLive(this.query, this.queryCells, page.query ?? {});
    this.settling = new Set();
    super.settleRoutes(previous, page);
    each(page.chain ?? [], (route) => {
      if (!this.settling.has(route)) {
        this.adopt(route, 'guard');
      }
    });
    this.settling = null;
    each(this.born, (born) => born.run.stop());
    this.born = [];
  }

  onRouteCreated(route, context) {
    route.abortSignal.addEventListener('abort', () => this.stopRuns(route), { once: true });
    this.settling?.add(route);
    this.adopt(route);
    return super.onRouteCreated(route, context);
  }

  onRouteUpdated(route, context) {
    this.settling?.add(route);
    this.adopt(route);
    return super.onRouteUpdated(route, context);
  }
}
