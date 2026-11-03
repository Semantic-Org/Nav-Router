import { each, inArray, isFunction } from '@semantic-ui/utils';

import { Router } from './router.js';

// the scaffolding every reactive provider would otherwise repeat. each hook runs inside the
// provider's reaction, learning its dependencies on the cascade's first pass without computing
// twice. when something it read moves, a later run lands the way that hook lands at navigation:
// a redirect moves the page, a refused permission redirects or shows forbidden, data updates its
// slice, and a title updates its title. a slice is a store with a cell per key, and merged data
// reads each key through its cell, so a key that moved wakes only the functions that read it, and
// a key a run returned equal is never written. a run born while its navigation is in flight ends
// with that navigation's signal, and once active it ends with the route's. a provider supplies the
// four primitives below; the fifth, the per-key store, is built from signals unless the provider
// has a native one ($state, a store, reactive())
export class ReactiveRouter extends Router {

  constructor(options) {
    super(options);
    // a tracked page is live; a cached result would not be
    this.entryCache = null;
    this.born = [];
    this.runs = new Map();
  }

  /*******************************
            Provider
  *******************************/

  // { get, set, peek }, equal values leaving dependents alone
  createSignal(initialValue) {
    throw new Error('ReactiveRouter: a provider supplies createSignal(value)');
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

  // { get(key), set(key, value), peek(key) }: a cell per key, made on first touch so a reader of a
  // key that arrives later is woken when it does. a provider with a native per-key object overrides it
  createStore(initialValue = {}) {
    const cells = new Map();
    const cell = (key) => {
      if (!cells.has(key)) {
        cells.set(key, this.createSignal(initialValue[key]));
      }
      return cells.get(key);
    };
    return {
      get: (key) => cell(key).get(),
      set: (key, value) => cell(key).set(value),
      peek: (key) => cell(key).peek(),
    };
  }

  // merges ancestor slices behind per-key getters, so reading data.team tracks team's cell alone
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

  // writes the keys that moved, dataChanged deciding per key, in one batch. the plain mirror is
  // written first so a synchronous reaction reads the new value through either door
  setSlice(slice, data) {
    const previous = slice.data;
    const moved = [];
    each({ ...previous, ...data }, (_, key) => {
      if (this.dataChanged(previous[key], data[key])) {
        moved.push(key);
      }
    });
    if (!moved.length) {
      return false;
    }
    slice.data = data;
    this.batch(() => {
      each(moved, (key) => slice.store.set(key, data[key]));
    });
    return true;
  }

  /*******************************
               Hooks
  *******************************/

  evaluateRedirect(route, fn, context) {
    return this.tracked({ route, fn, context, kind: 'guard', onRerun: (target) => this.redirectChanged(route, target) });
  }

  evaluatePermission(route, fn, context) {
    return this.tracked({ route, fn, context, kind: 'guard', onRerun: (allowed) => this.permissionChanged(route, allowed) });
  }

  evaluateData(route, fn, context) {
    return this.tracked({ route, fn, context, kind: 'slice', onRerun: (value) => this.updateData(route, value) });
  }

  evaluateTitle(route, fn, context) {
    return this.tracked({ route, fn, context, kind: 'slice', onRerun: (value) => this.updateTitle(route, value) });
  }

  // runs fn inside the provider's reaction and hands each later run's value to onRerun. the signal
  // the hook was given is the life its run belongs to: the navigation's while one is in flight, the
  // route's own when the standing page runs it. what the function reads of the slices above it is
  // its own dependency, through the data the provider makes readable
  tracked({ route, fn, context, kind, onRerun }) {
    if (!isFunction(fn)) {
      return fn;
    }
    const { signal, slices } = context;
    let first;
    const stop = this.createReaction((isFirst) => {
      const data = this.dataFor(slices);
      if (isFirst) {
        first = fn({ ...context, data });
        return;
      }
      if (route.active) {
        onRerun(fn({ ...context, data, signal: route.abortSignal }));
      }
    });
    const run = { stop, kind };
    if (signal === route.abortSignal) {
      this.runsOf(route).add(run);
    }
    else {
      const born = { route, run, adopted: false };
      signal?.addEventListener('abort', () => {
        if (!born.adopted) {
          stop();
        }
      }, { once: true });
      this.born.push(born);
    }
    return first;
  }

  runsOf(route) {
    if (!this.runs.has(route.id)) {
      this.runs.set(route.id, new Set());
    }
    return this.runs.get(route.id);
  }

  stopRuns(route, kind = null) {
    each([...this.runsOf(route)], (run) => {
      if (kind === null || run.kind === kind) {
        run.stop();
        this.runsOf(route).delete(run);
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
      this.runsOf(route).add(born.run);
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
