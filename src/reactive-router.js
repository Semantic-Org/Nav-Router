import { each, inArray, isFunction, isPromise, noop } from '@semantic-ui/utils';

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

  // the page's write, its settle and its render are one moment to a reader: inside a batch a view
  // sees the page and the chain move together, and a leaving view, disposed before the batch flushes,
  // never runs against the next page's keys
  applyCascade(matched, resolved, event = null) {
    return this.batch(() => super.applyCascade(matched, resolved, event));
  }

  updatePage(route) {
    return this.batch(() => super.updatePage(route));
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
  // the view's context made live, for an integration to render with: params, query and user through
  // cells of the store, data through dataFor over the slices' own cells so one key moving wakes its
  // reader alone, the slices and the page as cells of their own, each compared as the equality table
  // says. update writes the keys in one batch; an integration hangs it where its rendered view is told
  liveContext(context) {
    const { equality } = this.constructor;
    const store = this.createStore({ params: context.params, query: context.query, user: context.user });
    const slices = this.createSignal(context.slices, { equals: equality.slices });
    const page = this.createSignal(context.page, { equals: equality.snapshot });
    const live = { route: context.route, router: context.router, signal: context.signal };
    each(['params', 'query', 'user'], (key) => {
      Object.defineProperty(live, key, { get: () => store.get(key), enumerable: true });
    });
    Object.defineProperty(live, 'data', { get: () => this.dataFor(slices.get()), enumerable: true });
    Object.defineProperty(live, 'slices', { get: slices.get, enumerable: true });
    Object.defineProperty(live, 'page', { get: page.get, enumerable: true });
    live.update = (next) => {
      this.batch(() => {
        each(['params', 'query', 'user'], (key) => store.set(key, next[key]));
        slices.set(next.slices);
        page.set(next.page);
      });
    };
    return live;
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
    const stop = this.createReaction((isFirst) => {
      const data = this.dataFor(slices);
      if (isFirst) {
        first = fn({ ...context, data });
        return;
      }
      const unadopted = born && !born.adopted;
      // a run born for a navigation in flight runs under that navigation's signal and lands nothing on
      // the standing page, whose route may be the same one: its latest value waits for adopt
      const value = fn({ ...context, data, signal: unadopted ? signal : route.abortSignal });
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
