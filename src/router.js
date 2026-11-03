import {
  createCache,
  each,
  extend,
  inArray,
  isFunction,
  isEqual,
  isPlainObject,
  isPromise,
  isString,
  noop,
  toBoolean,
  toDate,
  toNumber,
  toDuration,
  toString,
  wait,
} from '@semantic-ui/utils';

import { IS_ROUTER } from './internal-helpers/identity.js';
import { isLazy } from './helpers/lazy.js';
import { setRouter } from './helpers/router.js';
import { Navigator } from './navigator.js';
import { Route } from './route.js';

const installed = new WeakSet();

export class Router extends Route {

  // brand router
  get [IS_ROUTER]() { return true; }
  static [Symbol.hasInstance](value) { return !!value?.[IS_ROUTER]; }

  // the day.js shape: a plugin is a function of (options, Router, Navigator) that patches a prototype.
  // it wraps a moment and calls through, never replaces one, or adds a method the core would
  // otherwise make every page carry. installed between navigations it takes effect on the next
  static extend(plugin, options) {
    if (!installed.has(plugin)) {
      installed.add(plugin);
      plugin(options, Router, Navigator);
    }
    return Router;
  }

  static defaults = {
    base: '',
    views: {},
    signInRoute: null,
    holdCommit: '300ms',
    loadingDelay: '200ms',
    loadingMin: '500ms',
    restoreScroll: null,
    attachGlobal: 'router',
    // whether data recomputed outside a navigation moved. plain data has one way to know, a deep
    // compare, and a render costs more than the walk; a reactive router's signals decide instead
    dataChanged: (previous, next) => !isEqual(next, previous),
  };

  constructor(options = {}) {
    super(extend({}, new.target.defaults, options));

    // the resolved settings in one place, for the console and for anything that introspects
    this.config = extend({}, new.target.defaults, options);
    this.base = this.normalizeBase(this.base);
    this.views = { ...new.target.defaults.views, ...options.views };
    this.layout ??= this.views.layout;

    this.routesByName ??= new Map();
    this.leaves ??= [];

    this.current = null;
    this.page = null;
    this.pending = null;
    this.error = null;

    this.entryCache = createCache({ maxSize: 100 });
    this.timers = new Set();
    this.listeners = new Set();
    this.activeAbort = null;

    this.navigator = new Navigator(this);
  }

  normalizeBase(base) {
    if (!base || base === '/') {
      return '';
    }
    const withLeading = base.startsWith('/') ? base : `/${base}`;
    return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
  }

  /*******************************
             Lifecycle
  *******************************/

  async start() {
    this.navigator.attach();
    // the helpers reach the started router. one per document is the common case, so it also lives
    // on window under this name for the console; a second router names itself otherwise
    setRouter(this);
    if (this.attachGlobal && globalThis.window) {
      globalThis[this.attachGlobal] = this;
    }

    const initialUrl = this.navigator.entry?.url
      ?? globalThis.location?.href
      ?? (this.base || '/');

    const matched = this.match(initialUrl);
    if (!matched) {
      this.page = { view: await this.resolveView(this.views?.notFound), status: 'notFound', url: initialUrl };
      await this.renderView(this.page);
      this.notify();
      return this;
    }

    this.commitRoute(matched);
    this.activeAbort?.abort();
    const controller = new AbortController();
    this.activeAbort = controller;

    // the one navigation the platform fires no event for: the same entering flow, a stand-in event
    const event = {
      initial: true,
      navigationType: this.navigator.activation?.navigationType ?? 'push',
      destination: { key: null },
      signal: controller.signal,
    };
    this.setPending(matched, event.navigationType);
    try {
      await this.afterCommit(this.begin(matched, event), event, false);
    }
    catch (error) {
      if (!controller.signal.aborted) {
        this.failed(error, event);
      }
    }
    if (!controller.signal.aborted) {
      this.pending = null;
      this.notify();
    }
    return this;
  }

  stop() {
    this.navigator.detach();
    setRouter(null);
    if (this.attachGlobal && globalThis[this.attachGlobal] === this) {
      delete globalThis[this.attachGlobal];
    }
    this.activeAbort?.abort();
    this.activeAbort = null;

    each(this.timers, (timer) => clearTimeout(timer));
    this.timers.clear();

    each([...(this.page?.chain ?? [])].reverse(), (route) => this.destroyRoute(route, this.lifecycleContext(route, null)));
    this.page = null;
    this.entryCache?.clear();
  }

  /*******************************
               Reads
  *******************************/

  match(url) {
    if (url == null) {
      return null;
    }
    const origin = globalThis.location?.origin ?? 'http://localhost';
    let parsed;
    let urlSegments;
    try {
      parsed = url instanceof URL ? url : new URL(String(url), origin);
      // another origin is never ours, and a malformed escape is no path of ours either
      if (parsed.origin !== origin) {
        return null;
      }
      const pathname = this.stripBase(parsed.pathname);
      if (pathname === null) {
        return null;
      }
      parsed.strippedPathname = pathname;
      urlSegments = pathname === '/' ? [] : pathname.slice(1).split('/').map((part) => decodeURIComponent(part));
    }
    catch {
      return null;
    }
    const pathname = parsed.strippedPathname;

    let bestLeaf = null;
    let bestParams = null;
    let bestScores = null;

    each(this.leaves, (leaf) => {
      const candidate = this.matchLeaf(leaf, urlSegments);
      if (candidate && (!bestLeaf || this.compareScores(candidate.scores, bestScores) > 0)) {
        bestLeaf = leaf;
        bestParams = candidate.params;
        bestScores = candidate.scores;
      }
    });

    if (!bestLeaf) {
      return null;
    }

    const query = this.coerceQuery(bestLeaf, parsed.searchParams);
    const currentRoutes = [...bestLeaf.ancestors];

    return {
      route: bestLeaf,
      url: parsed.href,
      pathname,
      search: parsed.search,
      hash: parsed.hash,
      params: bestParams,
      query,
      chain: currentRoutes,
      currentRoutes,
      redirect: bestLeaf.redirect ?? null,
    };
  }

  stripBase(rawPathname) {
    if (!this.base) {
      return this.normalizePathname(rawPathname);
    }
    if (rawPathname === this.base) {
      return '/';
    }
    if (rawPathname.startsWith(`${this.base}/`)) {
      return this.normalizePathname(rawPathname.slice(this.base.length));
    }
    return null;
  }

  normalizePathname(pathname) {
    if (!pathname || pathname === '/') {
      return '/';
    }
    const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return withLeading.length > 1 && withLeading.endsWith('/')
      ? withLeading.slice(0, -1)
      : withLeading;
  }

  matchLeaf(leaf, urlSegments) {
    const patternSegments = leaf.segments;
    if (urlSegments.length > patternSegments.length) {
      return null;
    }

    const params = {};
    const scores = [];

    for (let index = 0; index < patternSegments.length; index++) {
      const pattern = patternSegments[index];
      const segment = urlSegments[index];

      if (!pattern.startsWith(':')) {
        if (segment !== pattern) {
          return null;
        }
        scores.push(5);
        continue;
      }

      const isOptionalFlag = pattern.endsWith('?');
      const paramName = pattern.slice(1).replace(/\?$/, '');
      const spec = leaf.paramSpecs[paramName];

      if (segment !== undefined) {
        const coerced = this.coerceValue(segment, spec);
        if (coerced === null || (spec?.allowed && !inArray(coerced, spec.allowed))) {
          return null;
        }
        params[paramName] = coerced;
        // an allowed set beats a typed param beats a bare one, so siblings on one segment resolve by what they claim
        scores.push(spec?.allowed ? 4 : (spec?.type && spec.type !== String && spec.type !== 'string' ? 3 : 2));
      }
      else if (spec?.default !== undefined) {
        params[paramName] = spec.default;
        scores.push(1);
      }
      else if (isOptionalFlag) {
        params[paramName] = undefined;
        scores.push(1);
      }
      else {
        return null;
      }
    }

    each(leaf.paramSpecs, (spec, key) => {
      if (params[key] === undefined && spec.default !== undefined) {
        params[key] = spec.default;
      }
    });

    return { params, scores };
  }

  compareScores(scoresA, scoresB) {
    const maxLength = Math.max(scoresA.length, scoresB.length);
    for (let index = 0; index < maxLength; index++) {
      const diff = (scoresA[index] ?? 0) - (scoresB[index] ?? 0);
      if (diff !== 0) {
        return diff;
      }
    }
    return 0;
  }

  coerceQuery(leaf, searchParams) {
    const query = {};
    each(leaf.querySpecs, (spec, key) => {
      if (spec.default !== undefined) {
        query[key] = spec.default;
      }
    });

    for (const [key, rawValue] of searchParams.entries()) {
      const spec = leaf.querySpecs[key];
      if (!spec) {
        query[key] = toString(rawValue);
        continue;
      }
      const isFlag = (spec.type === Boolean || spec.type === 'boolean') && rawValue === '';
      const coerced = isFlag ? true : this.coerceValue(rawValue, spec);
      query[key] = (coerced === null || (spec.allowed && !inArray(coerced, spec.allowed)))
        ? spec.default
        : coerced;
    }

    return query;
  }

  coerceValue(rawValue, spec) {
    const type = spec?.type ?? String;
    if (type === Boolean || type === 'boolean') { return toBoolean(rawValue); }
    if (type === Number || type === 'number') { return toNumber(rawValue); }
    if (type === Date || type === 'date') { return toDate(rawValue); }
    return toString(rawValue);
  }

  // a route by name, a Route, or a literal path. args is one flat bag: a key the route declares as a
  // param fills the path, every other key is query. the fragment and the origin are options
  href(target, args = {}, { hash, absolute = false, keepQuery = false } = {}) {
    const route = this.routeFor(target);
    const rawPath = route ? route.path : (isString(target) && target ? target : '/');
    const { params } = this.splitArgs(route, args);
    const query = keepQuery ? { ...this.current?.query, ...this.splitArgs(route, args).query } : this.splitArgs(route, args).query;

    const segments = rawPath === '/' ? [] : rawPath.replace(/^\//, '').split('/');
    const resolvedSegments = [];
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      if (!segment.startsWith(':')) {
        resolvedSegments.push(segment);
        continue;
      }
      const isOptionalFlag = segment.endsWith('?');
      const paramName = segment.slice(1).replace(/\?$/, '');
      const value = params[paramName] ?? route?.paramSpecs[paramName]?.default;
      if (value === undefined || value === null) {
        if (isOptionalFlag && index === segments.length - 1) {
          continue;
        }
        throw new Error(`Router.href: missing required param "${paramName}" for "${route?.name ?? target}".`);
      }
      resolvedSegments.push(encodeURIComponent(this.formatParamValue(value)));
    }

    const pathname = `/${resolvedSegments.join('/')}`;
    const searchParams = new URLSearchParams();
    each(query, (value, key) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, this.formatParamValue(value));
      }
    });
    const search = searchParams.toString();
    const path = this.prependBase(search ? `${pathname}?${search}` : pathname) + (hash ? `#${hash}` : '');
    return absolute && globalThis.location ? new URL(path, globalThis.location.origin).href : path;
  }

  // the names people reach for; one implementation
  urlFor(...args) { return this.href(...args); }
  url(...args) { return this.href(...args); }

  // a name, a Route, or nothing: a literal path has no route and keeps every arg as query
  routeFor(target) {
    if (target instanceof Route) {
      return target;
    }
    const named = isString(target) ? this.routesByName.get(target) : null;
    return named ? (named.indexRoute ?? named) : null;
  }

  splitArgs(route, args = {}) {
    const params = {};
    const query = {};
    each(args, (value, key) => {
      if (route && key in route.paramSpecs) {
        params[key] = value;
      }
      else {
        query[key] = value;
      }
    });
    return { params, query };
  }

  // the args a redirect carries: the current params the target also declares
  paramsFor(target, params = {}) {
    const route = this.routeFor(target);
    const carried = {};
    each(params, (value, key) => {
      if (route && key in route.paramSpecs) {
        carried[key] = value;
      }
    });
    return carried;
  }

  formatParamValue(value) {
    return value instanceof Date ? value.toISOString() : String(value);
  }

  prependBase(path) {
    if (!this.base) { return path; }
    if (path === '/') { return this.base; }
    return path.startsWith('/') ? `${this.base}${path}` : `${this.base}/${path}`;
  }

  argsMatch(route, args) {
    const { params, query } = this.splitArgs(route, args);
    return Object.keys(params).every((key) => isEqual(this.current.params[key], params[key]))
      && Object.keys(query).every((key) => isEqual(this.current.query[key], query[key]));
  }

  get canGoBack() {
    return this.navigator.canGoBack;
  }

  get canGoForward() {
    return this.navigator.canGoForward;
  }

  get entry() { return this.navigator.entry; }
  get entries() { return this.navigator.entries; }
  get activation() { return this.navigator.activation; }
  get transition() { return this.navigator.transition; }

  /*******************************
              Writes
  *******************************/

  navigate(target, args = {}, { history = 'auto', state, info, resetScroll = true, resetFocus = true, hash, keepQuery, absolute } = {}) {
    return this.navigator.navigate(this.href(target, args, { hash, keepQuery, absolute }), { state, info, history, resetScroll, resetFocus });
  }

  reload(options) {
    return this.navigator.reload(options);
  }

  back(fallback = this.name, args = {}) {
    return this.navigator.back(fallback ? this.href(fallback, args) : (this.base || '/'));
  }

  forward() {
    return this.navigator.forward();
  }

  traverseTo(key, options) {
    return this.navigator.traverseTo(key, options);
  }

  /*******************************
              Moments
  *******************************/

  // the navigator hands each platform moment here by name: the only writers of the router's state

  intercepted(matched, event) {
    // the initial load is the one navigation the platform holds no signal for
    this.activeAbort?.abort();
    this.activeAbort = null;
    this.setPending(matched, event.navigationType);
    this.notify();
  }

  // the platform runs one navigation at a time, so pending is one match
  setPending(matched, navigationType) {
    this.pending = matched ? {
      route: matched.route,
      url: matched.url,
      params: matched.params,
      query: matched.query,
      chain: matched.chain,
      navigationType,
      loading: false,
      committed: false,
    } : null;
  }

  entryChanged(entry, event) {
    // a state-only change, such as scroll memory, moves no route and says nothing
    if (event?.navigationType === null) {
      return;
    }
    if (this.pending) {
      this.pending.committed = true;
    }
    const matched = this.match(entry?.url);
    if (matched) {
      this.commitRoute(matched);
    }
    else {
      this.notify();
    }
  }

  settled(event) {
    this.pending = null;
    this.error = null;
    this.notify();
  }

  async failed(error, event) {
    const pending = this.pending;
    this.pending = null;
    // a superseded, cancelled or refused navigation is not an error to show
    if (error?.name === 'AbortError') {
      this.notify();
      return;
    }
    this.error = {
      error,
      // transition is still set inside navigateerror, and its from is the last page that settled
      from: globalThis.navigation?.transition?.from ?? null,
      url: pending?.url ?? this.navigator.entry?.url ?? null,
    };
    // a failure before commit left the standing page in place; only a committed one is shown as an error
    const committed = !pending || pending.committed;
    if (committed && this.errorRoute) {
      this.navigator.deferNavigate(this.href(this.errorRoute), { history: 'replace' });
    }
    else if (committed) {
      const view = await this.resolveView(this.views?.error);
      if (!view) {
        this.logError(error);
      }
      // the routes on screen stay active under the error page, so the chain carries over
      this.page = { ...(pending ? this.pageFor(pending) : (this.page ?? {})), chain: this.page?.chain ?? [], slices: this.page?.slices ?? [], view, status: 'error', error };
      this.renderView(this.page).catch(noop);
    }
    else {
      this.logError(error);
    }
    this.notify();
  }

  // the one place core logs. an integration that wants its own namespace replaces this, the way
  // the timeline plugin wraps a moment
  logError(error) {
    console.error(error);
  }

  // back from bfcache with the dom intact: the route lifecycle sees an update, the page stays
  restored() {
    const matched = this.match(this.navigator.entry?.url);
    if (matched) {
      this.commitRoute(matched);
    }
  }

  disposed(entry) {
    if (entry?.key) {
      this.entryCache?.delete(entry.key);
    }
  }

  /*******************************
          Entering a Route
  *******************************/

  // the guard phase answers before the url may move, the data phase may run on after commit
  begin(matched, event) {
    const entryKey = event.navigationType === 'traverse' ? event.destination.key : null;
    // the visit's result rides its entry: a traverse back shows what was seen, reload() refreshes it
    const remembered = entryKey ? this.entryCache?.get(entryKey) : null;
    const cached = remembered && remembered.user === this.user ? remembered.resolved : null;
    // what the cascade knows of the navigation: its signal, whether it is a reload, the page it leaves
    const navigation = { signal: event.signal, reload: event.navigationType === 'reload', previous: this.page };
    const work = { matched, settled: false, result: null, redirected: null };
    work.guards = this.runGuards(matched, navigation);
    work.ready = work.guards.then((guard) => guard ?? cached ?? this.runData(matched, navigation));
    work.ready.then(
      (result) => {
        work.settled = true;
        work.result = result;
      },
      () => {
        work.settled = true;
      },
    );
    return work;
  }

  async beforeCommit(work, event, controller) {
    let active = work;
    for (let hop = 0; hop < 5; hop++) {
      const guard = await active.guards;
      if (guard?.status !== 'redirect') {
        break;
      }
      const isRewrite = event.navigationType === 'push' || event.navigationType === 'replace';
      const redirectedMatch = this.match(guard.redirect);
      if (!isRewrite || !redirectedMatch) {
        // a traverse or reload cannot be redirected before commit, and a target outside the routes is
        // the browser's: stay put, then go where the guard says
        this.navigator.deferNavigate(guard.redirect);
        throw new DOMException('Navigation refused', 'AbortError');
      }
      controller.redirect(guard.redirect);
      this.setPending(redirectedMatch, event.navigationType);
      this.navigator.transition.url = redirectedMatch.url;
      active = work.redirected = this.begin(redirectedMatch, event);
    }

    // a fast load settles before the url moves, a slow one commits into its loading state
    const holdMs = toDuration(this.holdCommit) ?? 0;
    if (!active.settled && holdMs > 0) {
      await Promise.race([
        active.ready.catch(noop),
        wait(holdMs, { abortController: event.signal, rejectOnAbort: false }),
      ]);
    }
  }

  async afterCommit(work, event, precommitRan) {
    const active = work.redirected ?? work;
    const { matched } = active;
    // the handler runs only once the url has moved, so this is a commit even where the platform's event did not say so
    if (this.pending) {
      this.pending.committed = true;
    }

    const delayMs = toDuration(this.loadingDelay) ?? 0;
    const minMs = toDuration(this.loadingMin) ?? 0;
    let loadingShownAt = null;

    if (!active.settled) {
      if (delayMs > 0) {
        await Promise.race([
          active.ready.catch(noop),
          wait(delayMs, { abortController: event.signal, rejectOnAbort: false }),
        ]);
      }
      if (!active.settled && !event.signal.aborted) {
        loadingShownAt = Date.now();
        if (this.pending) {
          this.pending.loading = true;
        }
        if (this.views?.loading) {
          const loadingView = await this.resolveView(this.views.loading);
          if (!active.settled && !event.signal.aborted) {
            // page stays the settled page: a loading view is rendered over it, pending.loading says so
            await this.renderView({ ...this.pageFor(matched), view: loadingView, status: 'loading' }, event);
          }
        }
        this.notify();
      }
    }

    const resolved = await active.ready;
    if (event.signal.aborted) {
      return;
    }

    if (resolved?.status === 'redirect' && resolved.redirect) {
      if (!precommitRan) {
        // no precommit on this browser: the refused url has shown, its slot becomes the redirect target,
        // a task later so this handler is not aborted by its own replacement
        this.navigator.deferNavigate(resolved.redirect, { history: 'replace' });
      }
      return;
    }

    if (loadingShownAt !== null && minMs > 0) {
      const elapsed = Date.now() - loadingShownAt;
      if (elapsed < minMs) {
        await wait(minMs - elapsed, { abortController: event.signal, rejectOnAbort: false });
      }
      if (event.signal.aborted) {
        return;
      }
    }

    await this.applyCascade(matched, resolved, event);
  }

  /*******************************
              Cascade
  *******************************/

  // the plain seam
  evaluate(route, fn, context) {
    return isFunction(fn) ? fn(context) : fn;
  }

  // one seam per hook, each a plain call here. the reactive scaffold wraps each in its own way,
  // because each has its own consequence when what it read moves: a redirect moves the page, a
  // refused permission lands as it would at navigation, data replaces its slice, a title its title
  evaluateRedirect(route, fn, context) {
    return this.evaluate(route, fn, context);
  }

  evaluatePermission(route, fn, context) {
    return this.evaluate(route, fn, context);
  }

  evaluateData(route, fn, context) {
    return this.evaluate(route, fn, context);
  }

  evaluateTitle(route, fn, context) {
    return this.evaluate(route, fn, context);
  }

  async runCascade(matched, navigation) {
    return (await this.runGuards(matched, navigation)) ?? this.runData(matched, navigation);
  }

  // what a hook sees. data is what the routes above settled, merged, and slices the same route by
  // route, none before the data phase; the signal is the navigation's while one is in flight and
  // the route's own otherwise
  contextFor(route, matched, { data = {}, slices = [], signal = route.abortSignal } = {}) {
    return { params: matched.params, query: matched.query, signal, user: this.user, route, router: this, data, slices };
  }

  // null when the route may be entered, otherwise the redirect or forbidden result
  async runGuards(matched, { signal }) {
    if (!matched) {
      return null;
    }

    const { route, params, query, currentRoutes } = matched;

    for (const ancestor of currentRoutes) {
      if (ancestor.redirect) {
        const target = await this.evaluateRedirect(ancestor, ancestor.redirect, this.contextFor(ancestor, matched, { signal }));
        return { status: 'redirect', redirect: this.href(target, this.paramsFor(target, params)), route, params, query };
      }
    }

    for (const ancestor of currentRoutes) {
      if (ancestor.permission !== undefined) {
        const allowed = await this.evaluatePermission(ancestor, ancestor.permission, this.contextFor(ancestor, matched, { signal }));
        if (!allowed) {
          if ((!this.user || !this.views?.forbidden) && this.signInRoute) {
            return { status: 'redirect', redirect: this.href(this.signInRoute), route, params, query };
          }
          const [view, layouts, slots, { title, titles }] = await Promise.all([
            this.resolveView(this.views?.forbidden),
            this.resolveLayouts(currentRoutes),
            this.resolveSlots(currentRoutes),
            this.evaluateTitles(currentRoutes, matched, { signal }),
          ]);
          return this.buildCascadeResult(matched, { status: 'forbidden', view, layouts, slots, data: {}, slices: [], title, titles });
        }
      }
    }

    return null;
  }

  // one slice per route in chain order. a route runs when the url as it sees it moved, the params
  // and query keys it can see with its ancestors' included, on a reload, or for another user;
  // otherwise it keeps its slice and never runs
  async runData(matched, { signal, reload = false, previous = null }) {
    const { route, currentRoutes } = matched;

    const [view, layouts, slots] = await Promise.all([
      this.resolveView(route.view),
      this.resolveLayouts(currentRoutes),
      this.resolveSlots(currentRoutes),
    ]);

    const data = {};
    const slices = [];
    const everyRoute = !previous || reload || previous.user !== this.user;
    let flaggedNotFound = false;
    const notFoundSymbol = Symbol('notFound');
    const notFound = () => {
      flaggedNotFound = true;
      return notFoundSymbol;
    };

    for (const ancestor of currentRoutes) {
      const kept = !everyRoute && previous.slices?.find((slice) => slice.route === ancestor);
      if (kept && !this.keysMoved(ancestor, previous, matched)) {
        slices.push(kept);
        extend(data, kept.data);
        continue;
      }

      let sliceData = {};
      if (ancestor.data !== undefined) {
        const rawData = await this.evaluateData(ancestor, ancestor.data, { ...this.contextFor(ancestor, matched, { data: { ...data }, slices: [...slices], signal }), notFound });
        if (flaggedNotFound || rawData === notFoundSymbol) {
          const [notFoundView, { title, titles }] = await Promise.all([
            this.resolveView(this.views?.notFound),
            this.evaluateTitles(currentRoutes, matched, { data, slices, signal }),
          ]);
          return this.buildCascadeResult(matched, { status: 'notFound', view: notFoundView, layouts, slots, data, slices, title, titles });
        }
        if (isPlainObject(rawData)) {
          sliceData = await this.resolveDataSlice(rawData);
        }
      }
      // the slice exists before the title and the routes below run, so they can read it
      const slice = this.sliceOf(ancestor, sliceData);
      extend(data, slice.data);
      if (ancestor.title !== undefined) {
        slice.title = await this.titleOf(ancestor, matched, { data: { ...data }, slices: [...slices, slice], signal });
      }
      slices.push(slice);
    }

    const titles = slices.map((slice) => slice.title).filter((title) => title !== null);
    return this.buildCascadeResult(matched, { status: 'ok', view, layouts, slots, data, slices, title: titles.at(-1) ?? '', titles });
  }

  // a route's share of the page. the reactive scaffold gives it a signal the routes below read
  sliceOf(route, data) {
    return { route, data, title: null };
  }

  // the url as this route sees it: every param and query key in its specs, ancestors' included
  keysMoved(route, previous, matched) {
    return Object.keys(route.paramSpecs).some((key) => !isEqual(previous.params?.[key], matched.params[key]))
      || Object.keys(route.querySpecs).some((key) => !isEqual(previous.query?.[key], matched.query[key]));
  }

  async titleOf(route, matched, { data = {}, slices = [], signal } = {}) {
    const value = await this.evaluateTitle(route, route.title, this.contextFor(route, matched, { data, slices, signal }));
    return this.titleText(value);
  }

  titleText(value) {
    return value === undefined || value === null || value === '' ? null : String(value);
  }

  async evaluateTitles(currentRoutes, matched, { data = {}, slices = [], signal } = {}) {
    const titles = [];
    for (const ancestor of currentRoutes) {
      if (ancestor.title !== undefined) {
        const title = await this.titleOf(ancestor, matched, { data, slices, signal });
        if (title !== null) {
          titles.push(title);
        }
      }
    }
    return { title: titles.at(-1) ?? '', titles };
  }

  buildCascadeResult({ route, params, query }, resolved) {
    return {
      redirect: null,
      route,
      params,
      query,
      ...resolved,
    };
  }

  // a value, a class, a module object, a promise, or a lazy thunk. a plain function is a view
  async resolveView(target) {
    if (!target) {
      return null;
    }
    if (isLazy(target)) {
      return target();
    }
    if (isPromise(target)) {
      const resolved = await target;
      return resolved?.default ?? resolved;
    }
    return target?.default ?? target;
  }

  async resolveLayouts(currentRoutes) {
    const layouts = [];
    for (const ancestor of currentRoutes) {
      if (ancestor.layout) {
        const resolved = await this.resolveView(ancestor.layout);
        if (resolved) {
          layouts.push(resolved);
        }
      }
    }
    return layouts;
  }

  async resolveSlots(currentRoutes) {
    const slots = {};
    for (const ancestor of currentRoutes) {
      if (ancestor.slots) {
        for (const key of Object.keys(ancestor.slots)) {
          slots[key] = await this.resolveView(ancestor.slots[key]);
        }
      }
    }
    return slots;
  }

  async resolveDataSlice(rawData) {
    const resolved = {};
    const pending = [];
    each(rawData, (value, key) => {
      if (isPromise(value)) {
        pending.push(value.then((settled) => { resolved[key] = settled; }));
      }
      else {
        resolved[key] = value;
      }
    });
    if (pending.length) {
      await Promise.all(pending);
    }
    return resolved;
  }

  commitRoute(matched) {
    if (!matched) {
      return null;
    }

    const snapshot = this.getEntrySnapshot();
    // the committed match and its entry, nothing of the page: the page is written at settle
    this.current = { ...matched, ...snapshot };

    this.notify();
    return this.current;
  }

  // every moment carries the navigation that caused it, so a plugin never holds one across moments
  async applyCascade(matched, resolved, event = null) {
    if (!resolved) {
      return;
    }
    const { key } = this.getEntrySnapshot();
    const previous = this.page;
    this.page = { ...this.pageFor(matched), ...resolved, chain: matched.chain, key, user: this.user };
    this.settleRoutes(previous, this.page);

    if (key && resolved.status === 'ok') {
      this.entryCache?.set(key, { resolved, user: this.user });
    }
    if (globalThis.document && resolved.title) {
      globalThis.document.title = resolved.title;
    }

    await this.renderView(this.page, event);
    this.notify();
  }

  pageFor({ route, url, params, query }) {
    return { route, url, params, query };
  }

  getEntrySnapshot() {
    const entry = this.navigator.entry ?? globalThis.navigation?.currentEntry ?? null;
    return {
      entry,
      key: entry?.key ?? null,
      id: entry?.id ?? null,
      state: entry?.getState?.() ?? null,
    };
  }

  /*******************************
          Route Lifecycles
  *******************************/

  // the page's chain is the active set. settle diffs it against the page before: destroyed in
  // reverse, then created and updated in chain order. a retained route whose slice is the one it
  // had did not move and hears nothing
  settleRoutes(previous, page) {
    const before = previous?.chain ?? [];
    const after = page.chain ?? [];
    const sliceOf = (of, route) => of?.slices?.find((slice) => slice.route === route) ?? null;

    each([...before].reverse(), (route) => {
      if (!inArray(route, after)) {
        this.destroyRoute(route, this.lifecycleContext(route, page, previous));
      }
    });
    each(after, (route) => {
      if (!inArray(route, before)) {
        route.activate();
        this.onRouteCreated(route, this.lifecycleContext(route, page, previous));
      }
      else if (sliceOf(page, route) !== sliceOf(previous, route)) {
        this.onRouteUpdated(route, this.lifecycleContext(route, page, previous));
      }
    });
  }

  destroyRoute(route, context) {
    this.onRouteDestroyed(route, context);
    route.deactivate();
  }

  // what a route's lifecycle callback sees, in the template's shape
  lifecycleContext(route, page, previous = null) {
    return {
      router: this,
      route,
      params: page?.params ?? {},
      query: page?.query ?? {},
      data: page?.data ?? {},
      previous,
      abortSignal: route.abortSignal,
      abortController: route.abortController,
      timeout: route.timeout.bind(route),
      interval: route.interval.bind(route),
    };
  }

  onRouteCreated(route, context) {
    return route.onCreated?.(context);
  }

  onRouteUpdated(route, context) {
    return route.onUpdated?.(context);
  }

  onRouteDestroyed(route, context) {
    return route.onDestroyed?.(context);
  }

  // what a moved hook does to the standing page, each the same landing as at navigation

  async redirectChanged(route, target) {
    const resolved = await target;
    if (resolved && inArray(route, this.page?.chain ?? [])) {
      this.navigator.navigate(this.href(resolved, this.paramsFor(resolved, this.page.params)), { history: 'replace' });
    }
  }

  async permissionChanged(route, allowed) {
    if (!inArray(route, this.page?.chain ?? [])) {
      return;
    }
    if (await allowed) {
      // a forbidden page whose guard now allows enters the route, as a fresh navigation would
      if (this.page.status === 'forbidden') {
        this.navigator.reload();
      }
      return;
    }
    if ((!this.user || !this.views?.forbidden) && this.signInRoute) {
      this.navigator.navigate(this.href(this.signInRoute), { history: 'replace' });
      return;
    }
    this.page = { ...this.page, view: await this.resolveView(this.views?.forbidden), status: 'forbidden' };
    await this.renderView(this.page);
    this.notify();
  }

  async updateTitle(route, value) {
    const slices = this.page?.slices;
    const slice = slices?.find((item) => item.route === route);
    if (!slice) {
      return;
    }
    const version = slice.titleVersion = (slice.titleVersion ?? 0) + 1;
    const title = this.titleText(await value);
    // a navigation settled meanwhile, a newer run landed first, or nothing moved
    if (this.page?.slices !== slices || slice.titleVersion !== version || title === slice.title) {
      return;
    }
    slice.title = title;
    await this.updatePage();
  }

  // a route's data recomputed outside a navigation: the slice is set, the page re-reads itself and
  // renders. anything that read the slice follows on its own
  async updateData(route, value) {
    const slices = this.page?.slices;
    const slice = slices?.find((item) => item.route === route);
    if (!slice) {
      return;
    }
    const version = slice.version = (slice.version ?? 0) + 1;
    const resolved = await value;
    const data = isPlainObject(resolved) ? await this.resolveDataSlice(resolved) : {};
    // a navigation settled meanwhile, a newer run landed first, or the slice did not move
    if (this.page?.slices !== slices || slice.version !== version || !this.setSlice(slice, data)) {
      return;
    }
    await this.updatePage();
  }

  // sets the slice and says whether it moved. plain data asks the dataChanged option, one compare;
  // the reactive router asks its signal, whose set already compared
  setSlice(slice, data) {
    if (!this.dataChanged(slice.data, data)) {
      return false;
    }
    slice.data = data;
    return true;
  }

  // the page re-read from its slices, which several updates in one tick share, so none of them
  // writes over another's
  async updatePage() {
    const { slices } = this.page;
    const data = {};
    each(slices, (slice) => extend(data, slice.data));
    const titles = slices.map((slice) => slice.title).filter((title) => title !== null);
    this.page = { ...this.page, data, title: titles.at(-1) ?? '', titles };
    if (globalThis.document && this.page.title) {
      globalThis.document.title = this.page.title;
    }
    await this.renderView(this.page);
    this.notify();
  }

  // awaited, so the platform's focus reset and scroll find the new dom. a traverse puts the named
  // containers back here, at the swap, which a view transition's update is part of
  async renderView(page, event = null) {
    await this.onRender?.(page, event);
    if (event?.navigationType === 'traverse' && this.restoreScroll) {
      this.navigator.restoreScroll(this.navigator.entry);
    }
  }

  subscribe(listener) {
    if (isFunction(listener)) {
      this.listeners.add(listener);
    }
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.onChange?.(this);
    each(this.listeners, (listener) => listener(this));
  }
}

export const router = (options) => new Router(options);
export const site = router; // alias
