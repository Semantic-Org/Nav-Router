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
  constructor(options) {
    super(options);
    // a tracked page is live; a cached result would not be
    this.entryCache = null;
    // the runs the navigation in flight has born and no route has adopted yet
    this.born = [];
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

  // { get(key), set(key, value), peek(key) }: a cell per key, made on first touch. a provider with a
  // native per-key object overrides it
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

  // merges ancestor slices behind per-key getters, so reading data.team tracks team's cell alone.
  // a getter exists for the keys a slice holds, so a key a run returns only sometimes is read plain
  // on the runs it is absent: a data() returns every key every run, undefined when it has none
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
        changed(value);
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
        born.changed(born.latest.value);
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
