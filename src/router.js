import { extend } from '@semantic-ui/utils';
import { IS_ROUTER } from './helpers/identity.js';
import { Navigator } from './navigator.js';
import { Route } from './route.js';

export class Router extends Route {

  // brand router
  get [IS_ROUTER]() { return true; }
  static [Symbol.hasInstance](value) { return !!value?.[IS_ROUTER]; }

  static defaults = {
    base: '',
    views: {},
    signInRoute: null,
    holdCommit: '300ms',
    loadingDelay: '200ms',
    loadingMin: '500ms',
    preload: 'intent',
    restoreScroll: null,
  };

  constructor(options) {
    // call super(extend({}, Router.defaults, options)) as root route node
    // initialize named route map, state (current, pending, error, entries), and entry key cache
    // instantiate this.navigator = new Navigator(this)
  }

  /*******************************
             Lifecycle
  *******************************/

  start() {
    // attach this.navigator to window.navigation
    // match initial currentEntry.url and run initial route cascade
  }

  stop() {
    // detach this.navigator and clear key cache and active timers
  }

  /*******************************
               Reads
  *******************************/

  match(url) {
    // match url against leaf routes, coercing path params and search query with defaults and allowed sets
    // diff matched ancestor chain against active chain into currentRoutes, updatedRoutes, removedRoutes
    // return resolved match descriptor with chains, params, query, or null if outside base
  }

  urlFor(nameOrPath, { params, query } = {}) {
    // look up named route (or its bound index leaf) in route map, or use path directly
    // interpolate required and optional path params and serialize query search string
  }

  get canGoBack() {
    // return this.navigator.canGoBack
  }

  get canGoForward() {
    // return this.navigator.canGoForward
  }

  /*******************************
              Writes
  *******************************/

  navigate(nameOrUrl, { params, query, state, info, history = 'auto', resetScroll = true, resetFocus = true } = {}) {
    // resolve destination url via urlFor(nameOrUrl, { params, query })
    // delegate to this.navigator.navigate with resolved url and options
  }

  reload(options) {
    // delegate to this.navigator.reload(options)
  }

  back({ fallback = this.name, params, query } = {}) {
    // resolve fallback url via urlFor(fallback, { params, query })
    // delegate to this.navigator.back(fallbackUrl)
  }

  forward() {
    // delegate to this.navigator.forward()
  }

  traverseTo(key, options) {
    // delegate to this.navigator.traverseTo(key, options)
  }

  /*******************************
              Cascade
  *******************************/

  evaluate(fn, context) {
    // base non-reactive seam: invoke fn(context) directly if function, else return fn
    // overridden in reactive subclass to run fn inside a tracked Reaction
  }

  runCascade(matched, signal) {
    // evaluate permission via this.evaluate across currentRoutes; redirect to signInRoute or swap views.forbidden
    // load lazy view/slots and evaluate data({ params, query, signal, notFound }) across current and updatedRoutes
    // flatten cascaded data object and evaluate title({ params, query, data }) via this.evaluate
  }

  commitRoute(matched) {
    // update current store with matched route, coerced params and query, and currentEntry
  }
}

export const router = (options) => new Router(options);
export const site = router; // alias
