import { each, isFunction } from '@semantic-ui/utils';

import { Router } from './router.js';

// the scaffolding every reactive provider would otherwise repeat. a route function runs inside
// the provider's tracker; the first run is the cascade's, so dependencies are learned without
// computing twice, and a later run, when something it read changes, recomputes the route's slice
// with a context built fresh at that moment. a run born while its navigation is in flight ends
// with that navigation's signal; once the route is active it ends with the route's. a route has
// as many runs as functions it declares, kept together. a provider supplies track() and nothing else
export class ReactiveRouter extends Router {

  constructor(options) {
    super(options);
    // a tracked page is live; a cached result would not be
    this.entryCache = null;
    this.born = [];
    this.runs = new Map();
    this.rerunning = null;
  }

  // run fn now and again whenever what it read changes; return the function that stops it
  track(fn) {
    throw new Error('ReactiveRouter: a provider supplies track(fn)');
  }

  evaluate(route, fn, context) {
    if (!isFunction(fn)) {
      return fn;
    }
    let first;
    let firstRun = true;
    const stop = this.track(() => {
      if (firstRun) {
        firstRun = false;
        first = fn(context);
        return;
      }
      if (route.active) {
        this.rerunning = stop;
        this.replaceSlice(route, fn(this.contextFor(route, this.page, this.dataAbove(route))));
        this.rerunning = null;
      }
    });
    if (route.active && context.signal === route.abortSignal) {
      // born outside a navigation, by replaceSlice: the route is already its home
      this.runsOf(route).add(stop);
    }
    else {
      const born = { route, stop, adopted: false };
      context.signal?.addEventListener('abort', () => {
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

  stopRuns(route, except = null) {
    each(this.runsOf(route), (stop) => {
      if (stop !== except) {
        stop();
        this.runsOf(route).delete(stop);
      }
    });
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

  onRouteCreated(route, context) {
    route.abortSignal.addEventListener('abort', () => this.stopRuns(route), { once: true });
    this.adopt(route);
    return super.onRouteCreated(route, context);
  }

  onRouteUpdated(route, context) {
    this.adopt(route);
    return super.onRouteUpdated(route, context);
  }

  // the route's other functions and every route below run again, so their old runs end first
  async replaceSlice(route, value) {
    const chain = this.page?.chain ?? [];
    const index = chain.indexOf(route);
    if (index < 0) {
      return;
    }
    this.stopRuns(route, this.rerunning);
    each(chain.slice(index + 1), (below) => this.stopRuns(below));
    return super.replaceSlice(route, value);
  }
}
