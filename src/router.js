import {
  createCache,
  each,
  extend,
  inArray,
  isClassConstructor,
  isFunction,
  isPlainObject,
  isPromise,
  noop,
  toBoolean,
  toDate,
  toNumber,
  toDuration,
  toString,
  wait,
} from '@semantic-ui/utils';

import { IS_ROUTER } from './helpers/identity.js';
import { Navigator } from './navigator.js';
import { Route } from './route.js';

const installed = new WeakSet();

export class Router extends Route {

  // brand router
  get [IS_ROUTER]() { return true; }
  static [Symbol.hasInstance](value) { return !!value?.[IS_ROUTER]; }

  // the day.js shape: a plugin is a function of (options, Router, Navigator) that patches a prototype.
  // the moments are the hooks, and a plugin wraps a moment and calls through, never replaces it
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
  };

  constructor(options = {}) {
    super(extend({}, Router.defaults, options));

    this.base = this.normalizeBase(this.base);
    this.views = { ...Router.defaults.views, ...options.views };
    this.layout ??= this.views.layout;

    this.routesByName ??= new Map();
    this.leaves ??= [];
    this.activeRoutes = new Map();
    this.currentRoute = null;

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

    const initialUrl = this.navigator.entry?.url
      ?? globalThis.location?.href
      ?? (this.base || '/');

    const matched = this.match(initialUrl);
    if (!matched) {
      return this;
    }

    this.commitRoute(matched);
    this.activeAbort?.abort();
    const controller = new AbortController();
    this.activeAbort = controller;

    const resolved = await this.runCascade(matched, controller.signal);
    if (controller.signal.aborted) {
      return this;
    }

    if (resolved.status === 'redirect' && resolved.redirect) {
      this.navigate(resolved.redirect, { history: 'replace' });
      return this;
    }

    await this.applyCascade(matched, resolved);
    return this;
  }

  stop() {
    this.navigator.detach();
    this.activeAbort?.abort();
    this.activeAbort = null;

    each(this.timers, (timer) => clearTimeout(timer));
    this.timers.clear();

    const activeEntries = [...this.activeRoutes.entries()].reverse();
    each(activeEntries, ([routeId, route]) => {
      this.activeRoutes.delete(routeId);
      this.onRouteDestroyed(routeId, route, { router: this });
    });

    this.currentRoute = null;
    this.entryCache.clear();
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
    const createdRoutes = currentRoutes.filter((route) => !this.activeRoutes.has(route.id));
    const updatedRoutes = currentRoutes.filter((route) => this.activeRoutes.has(route.id));
    const removedRoutes = [...this.activeRoutes.values()].filter((route) => !inArray(route, currentRoutes));

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
      createdRoutes,
      updatedRoutes,
      removedRoutes,
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

  urlFor(nameOrPath, { params = {}, query = {} } = {}) {
    if (!nameOrPath) {
      return this.base || '/';
    }

    const namedRoute = this.routesByName.get(nameOrPath);
    const targetRoute = namedRoute ? (namedRoute.indexRoute ?? namedRoute) : null;
    const rawPath = targetRoute ? targetRoute.path : String(nameOrPath);
    const paramSpecs = targetRoute ? targetRoute.paramSpecs : {};

    if (!targetRoute && rawPath.includes('?') && !Object.keys(params).length && !Object.keys(query).length) {
      return this.prependBase(rawPath);
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
      const value = params[paramName] ?? paramSpecs[paramName]?.default;

      if (value === undefined || value === null) {
        if (isOptionalFlag && index === segments.length - 1) {
          continue;
        }
        throw new Error(`Router.urlFor: missing required param "${paramName}" for "${nameOrPath}".`);
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
    return this.prependBase(search ? `${pathname}?${search}` : pathname);
  }

  formatParamValue(value) {
    return value instanceof Date ? value.toISOString() : String(value);
  }

  prependBase(path) {
    if (!this.base) { return path; }
    if (path === '/') { return this.base; }
    return path.startsWith('/') ? `${this.base}${path}` : `${this.base}/${path}`;
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

  navigate(nameOrUrl, { params, query, state, info, history = 'auto', resetScroll = true, resetFocus = true } = {}) {
    const url = this.urlFor(nameOrUrl, { params, query });
    return this.navigator.navigate(url, { state, info, history, resetScroll, resetFocus });
  }

  reload(options) {
    return this.navigator.reload(options);
  }

  back({ fallback = this.name, params, query } = {}) {
    const fallbackUrl = fallback ? this.urlFor(fallback, { params, query }) : (this.base || '/');
    return this.navigator.back(fallbackUrl);
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
    this.pending = {
      route: matched.route,
      url: matched.url,
      params: matched.params,
      query: matched.query,
      navigationType: event.navigationType,
      loading: false,
    };
    this.notify();
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
    if (this.errorRoute) {
      this.navigator.deferNavigate(this.urlFor(this.errorRoute), { history: 'replace' });
    }
    else {
      const view = this.views?.error ?? null;
      if (!view) {
        console.error(error);
      }
      this.page = { ...(pending ? this.pageFor(pending) : (this.page ?? {})), view, status: 'error', error };
      this.renderView(this.page).catch(noop);
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
      this.entryCache.delete(entry.key);
    }
  }

  /*******************************
          Entering a Route
  *******************************/

  // the guard phase answers before the url may move, the data phase may run on after commit
  begin(matched, event) {
    const entryKey = event.navigationType === 'traverse' ? event.destination.key : null;
    // the visit's result rides its entry: a traverse back shows what was seen, reload() refreshes it
    const cached = entryKey ? this.entryCache.get(entryKey) : null;
    const work = { matched, settled: false, result: null, redirected: null };
    work.guards = this.runGuards(matched, event.signal);
    work.ready = work.guards.then((guard) => guard ?? cached ?? this.runData(matched, event.signal));
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
            this.page = { ...this.pageFor(matched), view: loadingView, status: 'loading' };
            await this.renderView(this.page, event);
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

  evaluate(fn, context) {
    return isFunction(fn) ? fn(context) : fn;
  }

  async runCascade(matched, signal) {
    return (await this.runGuards(matched, signal)) ?? this.runData(matched, signal);
  }

  // null when the route may be entered, otherwise the redirect or forbidden result
  async runGuards(matched, signal) {
    if (!matched) {
      return null;
    }

    const { route, params, query, currentRoutes } = matched;
    const baseContext = { params, query, signal, user: this.user, route, router: this };

    for (const ancestor of currentRoutes) {
      if (ancestor.redirect) {
        const target = await this.evaluate(ancestor.redirect, baseContext);
        return {
          status: 'redirect',
          redirect: this.urlFor(target, { params, query }),
          route,
          params,
          query,
        };
      }
    }

    for (const ancestor of currentRoutes) {
      if (ancestor.permission !== undefined) {
        const allowed = await this.evaluate(ancestor.permission, baseContext);
        if (!allowed) {
          if ((!this.user || !this.views?.forbidden) && this.signInRoute) {
            return {
              status: 'redirect',
              redirect: this.urlFor(this.signInRoute),
              route,
              params,
              query,
            };
          }
          const [view, layouts, slots, { title, titles }] = await Promise.all([
            this.resolveView(this.views?.forbidden),
            this.resolveLayouts(currentRoutes),
            this.resolveSlots(currentRoutes),
            this.evaluateTitles(currentRoutes, { ...baseContext, data: {} }),
          ]);
          return this.buildCascadeResult(matched, {
            status: 'forbidden',
            view,
            layouts,
            slots,
            data: {},
            title,
            titles,
          });
        }
      }
    }

    return null;
  }

  async runData(matched, signal) {
    const { route, params, query, currentRoutes } = matched;
    const baseContext = { params, query, signal, user: this.user, route, router: this };

    const [view, layouts, slots] = await Promise.all([
      this.resolveView(route.view),
      this.resolveLayouts(currentRoutes),
      this.resolveSlots(currentRoutes),
    ]);

    const data = {};
    let flaggedNotFound = false;
    const notFoundSymbol = Symbol('notFound');
    const notFound = () => {
      flaggedNotFound = true;
      return notFoundSymbol;
    };

    for (const ancestor of currentRoutes) {
      if (ancestor.data === undefined) {
        continue;
      }
      const rawData = await this.evaluate(ancestor.data, {
        ...baseContext,
        data: { ...data },
        notFound,
      });

      if (flaggedNotFound || rawData === notFoundSymbol) {
        const [notFoundView, { title, titles }] = await Promise.all([
          this.resolveView(this.views?.notFound),
          this.evaluateTitles(currentRoutes, { ...baseContext, data }),
        ]);
        return this.buildCascadeResult(matched, {
          status: 'notFound',
          view: notFoundView,
          layouts,
          slots,
          data,
          title,
          titles,
        });
      }

      if (isPlainObject(rawData)) {
        extend(data, await this.resolveDataSlice(rawData));
      }
    }

    const { title, titles } = await this.evaluateTitles(currentRoutes, { ...baseContext, data });
    return this.buildCascadeResult(matched, {
      status: 'ok',
      view,
      layouts,
      slots,
      data,
      title,
      titles,
    });
  }

  // the chunks a link may need, warmed on intent; the module cache is the cache
  preloadViews(matched) {
    const { route, currentRoutes } = matched;
    return Promise.all([
      this.resolveView(route.view),
      this.resolveLayouts(currentRoutes),
      this.resolveSlots(currentRoutes),
    ]);
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

  async resolveView(target) {
    if (!target) {
      return null;
    }
    if (isPromise(target)) {
      const resolved = await target;
      return resolved?.default ?? resolved;
    }
    if (isFunction(target) && !isClassConstructor(target) && target.length === 0) {
      const result = target();
      if (isPromise(result)) {
        const resolved = await result;
        return resolved?.default ?? resolved;
      }
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

  async evaluateTitles(currentRoutes, context) {
    const titles = [];
    for (const ancestor of currentRoutes) {
      if (ancestor.title !== undefined) {
        const value = await this.evaluate(ancestor.title, context);
        if (value !== undefined && value !== null && value !== '') {
          titles.push(String(value));
        }
      }
    }
    return { title: titles.at(-1) ?? '', titles };
  }

  commitRoute(matched) {
    if (!matched) {
      return null;
    }

    const snapshot = this.getEntrySnapshot();
    const previous = this.current;
    const lifecycleContext = {
      router: this,
      matched,
      previous,
      params: matched.params,
      query: matched.query,
      entry: snapshot.entry,
    };

    each([...(matched.removedRoutes ?? [])].reverse(), (route) => {
      this.activeRoutes.delete(route.id);
      this.onRouteDestroyed(route.id, route, lifecycleContext);
    });

    each(matched.currentRoutes, (route) => {
      if (this.activeRoutes.has(route.id)) {
        this.onRouteUpdated(route.id, route, lifecycleContext);
      }
      else {
        this.activeRoutes.set(route.id, route);
        this.onRouteCreated(route.id, route, lifecycleContext);
      }
    });

    // the committed match and its entry, nothing of the page: the page is written at settle
    this.currentRoute = matched.route;
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
    this.page = { ...this.pageFor(matched), ...resolved, key };

    if (key) {
      this.entryCache.set(key, resolved);
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

  onRouteCreated(routeId, route, context) {
    return route.onCreated?.(context);
  }

  onRouteUpdated(routeId, route, context) {
    return route.onUpdated?.(context);
  }

  onRouteDestroyed(routeId, route, context) {
    return route.onDestroyed?.(context);
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
