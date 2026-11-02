import { each, extend, isFunction } from '@semantic-ui/utils';

import { Router } from './router.js';

// the scaffolding every reactive provider would otherwise repeat. each hook runs inside the
// provider's reaction; the first run is the cascade's, so dependencies are learned without
// computing twice, and a later run, when something it read moves, lands the way that hook lands
// at navigation: a redirect moves the page, a refused permission redirects or shows forbidden,
// data updates its slice, a title its title. a route's slice holds a signal, a run reads the
// slices above it, so a slice that moves reaches the routes that read it and no others. a run
// born while its navigation is in flight ends with that navigation's signal; once the route is
// active it ends with the route's. a provider supplies the four primitives below and nothing else
export class ReactiveRouter extends Router {

  static defaults = {
    ...Router.defaults,
    // the signal's own equality decides whether anything moved
    dataChanged: () => true,
  };

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

  /*******************************
              Slices
  *******************************/

  sliceOf(route, data) {
    const slice = super.sliceOf(route, data);
    slice.signal = this.createSignal(data);
    return slice;
  }

  setSlice(slice, data) {
    super.setSlice(slice, data);
    slice.signal?.set(data);
  }

  /*******************************
               Hooks
  *******************************/

  evaluateRedirect(route, fn, context) {
    return this.tracked({ route, fn, context, onRerun: (target) => this.redirectChanged(route, target) });
  }

  evaluatePermission(route, fn, context) {
    return this.tracked({ route, fn, context, onRerun: (allowed) => this.permissionChanged(route, allowed) });
  }

  evaluateData(route, fn, context) {
    return this.tracked({ route, fn, context, onRerun: (value) => this.updateData(route, value) });
  }

  evaluateTitle(route, fn, context) {
    return this.tracked({ route, fn, context, onRerun: (value) => this.updateTitle(route, value) });
  }

  // runs fn inside the provider's reaction and hands each later run's value to onRerun. the signal
  // the hook was given is the life its run belongs to: the navigation's while one is in flight, the
  // route's own when the standing page runs it. the slices it was given are read inside the run,
  // which is how the run comes to depend on them
  tracked({ route, fn, context, onRerun }) {
    if (!isFunction(fn)) {
      return fn;
    }
    const { signal, slices } = context;
    let first;
    const stop = this.createReaction((isFirst) => {
      const data = {};
      each(slices, (slice) => extend(data, slice.signal ? slice.signal.get() : slice.data));
      if (isFirst) {
        first = fn(context);
        return;
      }
      if (route.active) {
        onRerun(fn({ ...context, data }));
      }
    });
    if (signal === route.abortSignal) {
      this.runsOf(route).add(stop);
    }
    else {
      const born = { route, stop, adopted: false };
      signal?.addEventListener('abort', () => {
        if (!born.adopted) {
          stop();
        }
      }, { once: true });
      this.born.push(born);
    }
    return first;
  }

  /*******************************
               Runs
  *******************************/

  runsOf(route) {
    if (!this.runs.has(route.id)) {
      this.runs.set(route.id, new Set());
    }
    return this.runs.get(route.id);
  }

  stopRuns(route) {
    each(this.runsOf(route), (stop) => stop());
    this.runsOf(route).clear();
  }

  // the runs born for the route in the navigation that settled replace the last run's
  adopt(route) {
    const mine = this.born.filter((born) => born.route === route);
    this.born = this.born.filter((born) => born.route !== route);
    this.stopRuns(route);
    each(mine, (born) => {
      born.adopted = true;
      this.runsOf(route).add(born.stop);
    });
  }

  // after settle nothing is left unborn: what was not adopted belonged to a branch this navigation
  // abandoned, a precommit redirect's first chain among them
  settleRoutes(previous, page) {
    super.settleRoutes(previous, page);
    each(this.born, (born) => born.stop());
    this.born = [];
  }

  onRouteCreated(route, context) {
    route.abortSignal.addEventListener('abort', () => this.stopRuns(route), { once: true });
    this.adopt(route);
    return super.onRouteCreated(route, context);
  }

  onRouteUpdated(route, context) {
    this.adopt(route);
    return super.onRouteUpdated(route, context);
  }
}
