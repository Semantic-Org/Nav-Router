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
  };

  constructor(options = {}) {
    super(extend({}, Router.defaults, options));

    // the resolved settings in one place, for the console and for anything that introspects
    this.config = extend({}, Router.defaults, options);
    this.base = this.normalizeBase(this.base);
    this.views = { ...Router.defaults.views, ...options.views };
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
      this.page = { view: this.views?.notFound ?? null, status: 'notFound', url: initialUrl };
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
    try {
      parsed = url instanceof URL ? url : new URL(String(url), origin);
    }
    catch {
      return null;
    }

    const pathname = this.stripBase(parsed.pathname);
    if (pathname === null) {
      return null;
    }

    const urlSegments = pathname === '/'
      ? []
      : pathname.slice(1).split('/').map((part) => decodeURIComponent(part));

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
        scores.push(4);
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
        scores.push(spec?.allowed ? 3 : 2);
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
    const { params, query } = this.splitArgs(route, args);
    if (keepQuery) {
      extend(query, this.current?.query ?? {}, query);
    }

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

  navigate(target, args = {}, { history = 'auto', state, info, resetScroll = true, resetFocus = true } = {}) {
    return this.navigator.navigate(this.href(target, args), { state, info, history, resetScroll, resetFocus });
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
    } : null;
  }

  entryChanged(entry, event) {
    // a state-only change, such as scroll memory, moves no route
    const matched = event?.navigationType !== null ? this.match(entry?.url) : null;
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

  failed(error, event) {
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
    const committed = !pending || this.navigator.entry?.url === pending.url;
    if (committed && this.errorRoute) {
      this.navigator.deferNavigate(this.href(this.errorRoute), { history: 'replace' });
    }
    else if (committed) {
      const view = this.views?.error ?? null;
      if (!view) {
        console.error(error);
      }
      // the routes on screen stay active under the error page, so the chain carries over
      this.page = { ...(pending ? this.pageFor(pending) : (this.page ?? {})), chain: this.page?.chain ?? [], slices: this.page?.slices ?? [], view, status: 'error', error };
      this.renderView(this.page).catch(noop);
    }
    else {
      console.error(error);
    }
    this.notify();
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
    const cached = entryKey ? this.entryCache?.get(entryKey) : null;
    const work = {
      matched,
      signal: event.signal,
      reload: event.navigationType === 'reload',
      previous: this.page,
      settled: false,
      result: null,
      redirected: null,
    };
    work.guards = this.runGuards(matched, work);
    work.ready = work.guards.then((guard) => guard ?? cached ?? this.runData(matched, work));
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
      if (!isRewrite) {
        // a traverse or reload cannot be redirected before commit: stay put, then go where the guard says
        this.navigator.deferNavigate(guard.redirect);
        throw new DOMException('Navigation refused', 'AbortError');
      }
      controller.redirect(guard.redirect);
      const redirectedMatch = this.match(guard.redirect);
      if (!redirectedMatch) {
        break;
      }
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
        // no precommit on this browser: the refused url has shown, its slot becomes the redirect target
        this.navigator.navigate(resolved.redirect, { history: 'replace' });
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

  // the base seam: a plain call. the reactive scaffold overrides it
  evaluate(route, fn, context) {
    return isFunction(fn) ? fn(context) : fn;
  }

  async runCascade(matched, work) {
    return (await this.runGuards(matched, work)) ?? this.runData(matched, work);
  }

  contextFor(route, matched, data, signal = route.abortSignal) {
    return { params: matched.params, query: matched.query, signal, user: this.user, route, router: this, data };
  }

  // null when the route may be entered, otherwise the redirect or forbidden result
  async runGuards(matched, work) {
    if (!matched) {
      return null;
    }

    const { route, params, query, currentRoutes } = matched;

    for (const ancestor of currentRoutes) {
      if (ancestor.redirect) {
        const target = await this.evaluate(ancestor, ancestor.redirect, this.contextFor(ancestor, matched, {}, work.signal));
        return { status: 'redirect', redirect: this.href(target, this.paramsFor(target, params)), route, params, query };
      }
    }

    for (const ancestor of currentRoutes) {
      if (ancestor.permission !== undefined) {
        const allowed = await this.evaluate(ancestor, ancestor.permission, this.contextFor(ancestor, matched, {}, work.signal));
        if (!allowed) {
          if ((!this.user || !this.views?.forbidden) && this.signInRoute) {
            return { status: 'redirect', redirect: this.href(this.signInRoute), route, params, query };
          }
          const [view, layouts, slots, { title, titles }] = await Promise.all([
            this.resolveView(this.views?.forbidden),
            this.resolveLayouts(currentRoutes),
            this.resolveSlots(currentRoutes),
            this.evaluateTitles(currentRoutes, matched, {}, work.signal),
          ]);
          return this.buildCascadeResult(matched, { status: 'forbidden', view, layouts, slots, data: {}, slices: [], title, titles });
        }
      }
    }

    return null;
  }

  // one slice per route in chain order. an ancestor whose own keys did not move keeps its slice and
  // never runs; from the first route that moved, everything below it runs with fresh data above it
  async runData(matched, work) {
    const { route, currentRoutes } = matched;
    const previous = work?.previous;

    const [view, layouts, slots] = await Promise.all([
      this.resolveView(route.view),
      this.resolveLayouts(currentRoutes),
      this.resolveSlots(currentRoutes),
    ]);

    const data = {};
    const slices = [];
    let changed = !previous || work?.reload || previous.user !== this.user;
    let flaggedNotFound = false;
    const notFoundSymbol = Symbol('notFound');
    const notFound = () => {
      flaggedNotFound = true;
      return notFoundSymbol;
    };

    for (const ancestor of currentRoutes) {
      const kept = !changed && previous.slices?.find((slice) => slice.route === ancestor);
      if (kept && this.ownKeysUnchanged(ancestor, previous, matched)) {
        slices.push(kept);
        extend(data, kept.data);
        continue;
      }
      changed = true;

      const slice = { route: ancestor, data: {}, title: null };
      if (ancestor.data !== undefined) {
        const rawData = await this.evaluate(ancestor, ancestor.data, { ...this.contextFor(ancestor, matched, { ...data }, work.signal), notFound });
        if (flaggedNotFound || rawData === notFoundSymbol) {
          const [notFoundView, { title, titles }] = await Promise.all([
            this.resolveView(this.views?.notFound),
            this.evaluateTitles(currentRoutes, matched, data, work.signal),
          ]);
          return this.buildCascadeResult(matched, { status: 'notFound', view: notFoundView, layouts, slots, data, slices, title, titles });
        }
        if (isPlainObject(rawData)) {
          slice.data = await this.resolveDataSlice(rawData);
          extend(data, slice.data);
        }
      }
      if (ancestor.title !== undefined) {
        slice.title = await this.evaluateTitle(ancestor, matched, { ...data }, work.signal);
      }
      slices.push(slice);
    }

    const titles = slices.map((slice) => slice.title).filter((title) => title !== null);
    return this.buildCascadeResult(matched, { status: 'ok', view, layouts, slots, data, slices, title: titles.at(-1) ?? '', titles });
  }

  ownKeysUnchanged(route, previous, matched) {
    const { params, query } = route.ownKeys;
    return params.every((key) => isEqual(previous.params?.[key], matched.params[key]))
      && query.every((key) => isEqual(previous.query?.[key], matched.query[key]));
  }

  async evaluateTitle(route, matched, data, signal) {
    const value = await this.evaluate(route, route.title, this.contextFor(route, matched, data, signal));
    return value === undefined || value === null || value === '' ? null : String(value);
  }

  async evaluateTitles(currentRoutes, matched, data, signal) {
    const titles = [];
    for (const ancestor of currentRoutes) {
      if (ancestor.title !== undefined) {
        const title = await this.evaluateTitle(ancestor, matched, data, signal);
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
      this.entryCache?.set(key, resolved);
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
  // reverse, then created and updated in chain order
  settleRoutes(previous, page) {
    const before = previous?.chain ?? [];
    const after = page.chain ?? [];

    each([...before].reverse(), (route) => {
      if (!inArray(route, after)) {
        this.destroyRoute(route, this.lifecycleContext(route, page, previous));
      }
    });
    each(after, (route) => {
      if (inArray(route, before)) {
        this.onRouteUpdated(route, this.lifecycleContext(route, page, previous));
      }
      else {
        route.activate();
        this.onRouteCreated(route, this.lifecycleContext(route, page, previous));
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

  // what the routes above this one settled, merged, as a data function sees it
  dataAbove(route) {
    const data = {};
    for (const slice of this.page?.slices ?? []) {
      if (slice.route === route) {
        break;
      }
      extend(data, slice.data);
    }
    return data;
  }

  // a route's slice recomputed outside a navigation: the routes below it run again with fresh data
  // above them, the page re-merges, and it renders through the same moment a navigation uses
  async replaceSlice(route, value) {
    const page = this.page;
    if (!page?.slices || !inArray(route, page.chain)) {
      return;
    }
    const index = page.chain.indexOf(route);
    const matched = { route: page.route, params: page.params, query: page.query, chain: page.chain, currentRoutes: page.chain };
    const data = {};
    each(page.slices.slice(0, index), (slice) => extend(data, slice.data));

    const slices = page.slices.slice(0, index);
    const fresh = { route, data: isPlainObject(await value) ? await this.resolveDataSlice(await value) : {}, title: null };
    extend(data, fresh.data);
    fresh.title = route.title !== undefined ? await this.evaluateTitle(route, matched, { ...data }, route.abortSignal) : null;
    slices.push(fresh);

    for (const below of page.chain.slice(index + 1)) {
      const slice = { route: below, data: {}, title: null };
      if (below.data !== undefined) {
        const rawData = await this.evaluate(below, below.data, this.contextFor(below, matched, { ...data }));
        if (isPlainObject(rawData)) {
          slice.data = await this.resolveDataSlice(rawData);
          extend(data, slice.data);
        }
      }
      if (below.title !== undefined) {
        slice.title = await this.evaluateTitle(below, matched, { ...data });
      }
      slices.push(slice);
    }
    if (this.page !== page) {
      return;
    }

    const titles = slices.map((slice) => slice.title).filter((title) => title !== null);
    this.page = { ...page, data, slices, title: titles.at(-1) ?? '', titles };
    if (globalThis.document && this.page.title) {
      globalThis.document.title = this.page.title;
    }
    await this.renderView(this.page);
    this.notify();
  }

  // awaited, so the platform's focus reset and scroll find the new dom
  async renderView(page, event = null) {
    await this.onRender?.(page, event);
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
