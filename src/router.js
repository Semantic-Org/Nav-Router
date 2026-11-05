import {
  createCache,
  each,
  extend,
  inArray,
  isEqual,
  isFunction,
  isPlainObject,
  isPromise,
  isString,
  noop,
  toBoolean,
  toDate,
  toDuration,
  toNumber,
  toString,
  wait,
} from '@semantic-ui/utils';

import { isLazy } from './helpers/lazy.js';
import { setRouter } from './helpers/router.js';
import { IS_ROUTER } from './internal-helpers/identity.js';
import { Navigator } from './navigator.js';
import { Route } from './route.js';

// what a data() returns through notFound(), at navigation or on the standing page
const NOT_FOUND = Symbol('notFound');

export class Router {
  // brand router
  get [IS_ROUTER]() {
    return true;
  }
  static [Symbol.hasInstance](value) {
    return !!value?.[IS_ROUTER];
  }

  // the day.js shape: a plugin is a function of (options, Router, Navigator) that patches a prototype.
  // it wraps a moment and calls through, never replaces one, or adds a method the core would
  // otherwise make every page carry. installed between navigations it takes effect on the next
  static extend(plugin, options) {
    // the plugin carries its own mark, as day.js marks one
    if (!plugin.installed) {
      plugin.installed = true;
      plugin(options, Router, Navigator);
    }
    return Router;
  }

  static defaults = {
    base: '',
    // the view for each status a page can stand in: loading, notFound, forbidden, error
    statusViews: {},
    signInRoute: null,
    // the user the guards read: a value, or a function of the navigation returning one or a promise of one
    identity: null,
    holdCommit: '300ms',
    loadingDelay: '200ms',
    loadingMin: '500ms',
    restoreScroll: null,
    attachGlobal: 'router',
    errorRoute: null,
    // the one state key declared here: the user the guards read, which the identity door writes
    // after this, so config shows the one the router started with
    user: null,
    onRender: null,
    onChange: null,
    // whether data recomputed outside a navigation moved: a deep compare, since a render costs more
    // than the walk. plain data asks it of the whole slice, and a reactive slice asks its cells instead
    dataChanged: (previous, next) => !isEqual(next, previous),
  };

  // one bag: the keys the defaults declare are the router's settings, every other key is the root
  // route's, so the router holds nothing of a route's and the root nothing of the router's. a key
  // neither knows lands on the root, unchecked, as it landed on the router before
  constructor(options = {}) {
    const defaults = new.target.defaults; // new.target so a subclass can declare its own defaults
    const settings = {};
    const routeOptions = {};
    each(options, (value, key) => {
      const owner = key in defaults ? settings : routeOptions;
      owner[key] = value;
    });
    // the resolved settings in one place, for the console and for anything that introspects
    this.config = extend({}, defaults, settings);
    extend(this, this.config);
    this.base = this.normalizeBase(this.base);
    this.statusViews = { ...defaults.statusViews, ...settings.statusViews };

    this.routesByName = new Map();
    this.leaves = [];
    this.root = new Route(routeOptions, null, this);

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

  // the tree is built on the root, through the router
  index(options) {
    return this.root.index(options);
  }

  section(options) {
    return this.root.section(options);
  }

  route(options) {
    return this.root.route(options);
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
    try {
      if (matched) {
        this.setPending(matched, event.navigationType);
        await this.afterCommit(this.begin(matched, event), event, false);
      }
      else {
        await this.landNotFound(initialUrl, event);
      }
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

  // no route for the url: the root runs its slice as the routes above a refusal do, the user read
  // first, so a root with data frames the cold not-found with what it reads
  async landNotFound(url, event) {
    const navigation = { signal: event.signal, reload: false, previous: null };
    await this.resolveIdentity(navigation);
    const [view, views, { slices }] = await Promise.all([
      this.resolveView(this.statusViews?.notFound),
      this.resolveRouteViews([this.root]),
      this.runSlices([this.root], { params: {}, query: {} }, navigation),
    ]);
    const titles = slices.map((slice) => slice.title).filter((title) => title !== null);
    const page = {
      view,
      views,
      chain: [this.root],
      slices,
      status: 'notFound',
      url,
      title: titles.at(-1) ?? '',
      titles,
    };
    await this.batch(() => {
      this.page = page;
      this.settleRoutes(null, page);
      return this.renderPage(page);
    });
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

    each(
      [...(this.page?.chain ?? [])].reverse(),
      (route) => this.destroyRoute(route, this.lifecycleContext(route, null)),
    );
    this.page =
      this.current =
      this.pending =
      this.error =
        null;
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
    if (urlSegments.length > patternSegments.length && patternSegments.at(-1) !== '*') {
      return null;
    }

    const params = {};
    const scores = [];

    for (let index = 0; index < patternSegments.length; index++) {
      const pattern = patternSegments[index];
      const segment = urlSegments[index];

      if (pattern === '*') {
        // the rest takes the lowest rung, and empty it ranks below a route that ends here
        params['*'] = urlSegments.slice(index).join('/');
        scores.push(segment !== undefined ? 1 : -2);
        break;
      }
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
        if (
          coerced === null || (spec?.allowed && !inArray(coerced, spec.allowed))
          || (spec?.validator && !spec.validator(coerced))
        ) {
          return null;
        }
        params[paramName] = coerced;
        // an allowed set beats a typed or validated param beats a bare one, so siblings on one segment resolve by what they claim
        scores.push(
          spec?.allowed
            ? 4
            : (spec?.validator || (spec?.type && spec.type !== String && spec.type !== 'string') ? 3 : 2),
        );
      }
      else if (spec?.default !== undefined) {
        params[paramName] = spec.default;
        scores.push(-1);
      }
      else if (isOptionalFlag) {
        params[paramName] = undefined;
        scores.push(-1);
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
      // the return address is a path on this origin, declared or not
      if (key === 'returnTo' && !(rawValue.startsWith('/') && this.sameOrigin(rawValue))) {
        continue;
      }
      const spec = leaf.querySpecs[key];
      if (!spec) {
        query[key] = toString(rawValue);
        continue;
      }
      const isFlag = (spec.type === Boolean || spec.type === 'boolean') && rawValue === '';
      const coerced = isFlag ? true : this.coerceValue(rawValue, spec);
      query[key] = (coerced === null || (spec.allowed && !inArray(coerced, spec.allowed))
          || (spec.validator && !spec.validator(coerced)))
        ? spec.default
        : coerced;
    }

    return query;
  }

  sameOrigin(url) {
    const origin = globalThis.location?.origin ?? 'http://localhost';
    try {
      return new URL(url, origin).origin === origin;
    }
    catch {
      return false;
    }
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
    const { params, query: own } = this.splitArgs(route, args);
    const query = keepQuery ? { ...this.current?.query, ...own } : own;
    let rawPath = route ? route.path : '/';
    // a literal is a url: another origin or a path outside base passes through whole, its own query and fragment ride
    if (!route && isString(target) && target) {
      const origin = globalThis.location?.origin ?? 'http://localhost';
      const literal = new URL(target, globalThis.location?.href ?? origin);
      const stripped = literal.origin === origin ? this.stripBase(literal.pathname) : null;
      if (stripped === null) {
        return target;
      }
      rawPath = stripped;
      literal.searchParams.forEach((value, key) => {
        query[key] ??= value;
      });
      hash ??= literal.hash.slice(1) || undefined;
    }

    const segments = rawPath === '/' ? [] : rawPath.replace(/^\//, '').split('/');
    const resolvedSegments = [];
    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      // a literal is literal: nothing in it expands
      if (!route) {
        resolvedSegments.push(segment);
        continue;
      }
      if (segment === '*') {
        resolvedSegments.push(...String(params['*'] ?? '').split('/').filter(Boolean).map(encodeURIComponent));
        continue;
      }
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
    const pairs = [];
    each(query, (value, key) => {
      const spec = route?.querySpecs[key];
      // a value equal to its default leaves the url, and a declared boolean's true is the bare key
      if (value === undefined || value === null || isEqual(value, spec?.default)) {
        return;
      }
      const bare = value === true && (spec?.type === Boolean || spec?.type === 'boolean');
      pairs.push(
        bare
          ? encodeURIComponent(key)
          : `${encodeURIComponent(key)}=${encodeURIComponent(this.formatParamValue(value))}`,
      );
    });
    const search = pairs.join('&');
    const path = this.prependBase(search ? `${pathname}?${search}` : pathname) + (hash ? `#${hash}` : '');
    return absolute && globalThis.location ? new URL(path, globalThis.location.origin).href : path;
  }

  // the names people reach for; one implementation
  urlFor(...args) {
    return this.href(...args);
  }
  url(...args) {
    return this.href(...args);
  }

  // a name, a Route, or nothing: a literal path has no route and keeps every arg as query
  routeFor(target) {
    if (target === this) {
      return this.root;
    }
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

  // the address a sign-in redirect carries back: a path under base, so the sign-in page can navigate to it
  returnAddress({ pathname, search, hash }) {
    return `${this.prependBase(pathname)}${search}${hash}`;
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

  get entry() {
    return this.navigator.entry;
  }
  get entries() {
    return this.navigator.entries;
  }
  get activation() {
    return this.navigator.activation;
  }
  get transition() {
    return this.navigator.transition;
  }

  /*******************************
              Writes
  *******************************/

  navigate(
    target,
    args = {},
    { history = 'auto', state, info, resetScroll = true, resetFocus = true, hash, keepQuery, absolute } = {},
  ) {
    return this.navigator.navigate(this.href(target, args, { hash, keepQuery, absolute }), {
      state,
      info,
      history,
      resetScroll,
      resetFocus,
    });
  }

  reload(options) {
    return this.navigator.reload(options);
  }

  back(fallback = this.root.name, args = {}) {
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
    this.pending = matched
      ? {
        route: matched.route,
        url: matched.url,
        params: matched.params,
        query: matched.query,
        chain: matched.chain,
        navigationType,
        loading: false,
        committed: false,
      }
      : null;
  }

  entryChanged(entry, event) {
    // a state-only change, such as scroll memory, moves no route and says nothing
    if (event?.navigationType === null) {
      return;
    }
    if (this.pending) {
      this.pending = { ...this.pending, committed: true };
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
      // the loading view it showed leaves, the standing page's own view comes back
      if (pending?.loading && this.page) {
        this.renderPage(this.page).catch(noop);
      }
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
      const view = await this.resolveView(this.statusViews?.error).catch(() => null);
      if (!view) {
        this.logError(error);
      }
      // the routes on screen stay active under the error page, so the chain carries over. a cold
      // error, nothing yet shown, is the root's to show: framed by its layout when the root has no
      // data of its own, since the data that failed may be the root's, and bare at the mount otherwise
      const previous = this.page;
      const views = previous?.views ?? await this.resolveRouteViews([this.root]).catch(() => []);
      await this.batch(() => {
        this.page = {
          ...(pending ? this.pageFor(pending) : (previous ?? {})),
          chain: previous?.chain ?? [this.root],
          slices: previous?.slices ?? (this.root.data === undefined ? [this.sliceOf(this.root, {})] : []),
          views,
          view,
          status: 'error',
          error,
        };
        this.settleRoutes(previous, this.page);
        return this.renderPage(this.page);
      }).catch(noop);
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
  // read once per navigation, ahead of the guards and under holdCommit with them. absent, user is whatever the app set
  async resolveIdentity(navigation) {
    if (this.identity == null) {
      return;
    }
    const user = (await (isFunction(this.identity) ? this.identity(navigation) : this.identity)) ?? null;
    if (!navigation.signal?.aborted) {
      this.user = user;
    }
  }

  begin(matched, event, identity = null) {
    const entryKey = event.navigationType === 'traverse' ? event.destination.key : null;
    // the visit's result rides its entry: a traverse back shows what was seen for the same user, reload() refreshes it
    const remembered = entryKey ? this.entryCache?.get(entryKey) : null;
    const cached = () => (remembered && !this.dataChanged(remembered.user, this.user) ? remembered.resolved : null);
    // what the cascade knows of the navigation: its signal, whether it is a reload, the page it leaves
    const navigation = { signal: event.signal, reload: event.navigationType === 'reload', previous: this.page };
    const work = {
      matched,
      settled: false,
      result: null,
      redirected: null,
      identity: identity ?? this.resolveIdentity(navigation),
    };
    work.guards = work.identity.then(() => this.runGuards(matched, navigation));
    work.ready = work.guards.then((guard) => guard ?? cached() ?? this.runData(matched, navigation));
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
        // a reload or a replace meant to stay, so the redirect replaces. a refused traverse leaves the user where they stood, so it pushes
        this.navigator.deferNavigate(guard.redirect, {
          history: event.navigationType === 'reload' || event.navigationType === 'replace'
            ? 'replace'
            : 'push',
        });
        throw new DOMException('Navigation refused', 'AbortError');
      }
      controller.redirect(guard.redirect);
      this.setPending(redirectedMatch, event.navigationType);
      this.navigator.transition.url = redirectedMatch.url;
      active = work.redirected = this.begin(redirectedMatch, event, active.identity);
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
      this.pending = { ...this.pending, committed: true };
    }

    const delayMs = toDuration(this.loadingDelay) ?? 0;
    const minMs = toDuration(this.loadingMin) ?? 0;
    let loadingShownAt = null;
    let coldLoading = null;

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
          this.pending = { ...this.pending, loading: true };
        }
        if (this.statusViews?.loading) {
          const loadingView = await this.resolveView(this.statusViews.loading);
          if (!active.settled && !event.signal.aborted) {
            // page stays the settled page: a loading view is rendered over it with its slices, so a
            // leaf's own slots re-render against what stands, and pending.loading says so. on a cold
            // boot nothing stands to render it inside, so it is made at the mount and leaves before
            // the page lands, or with the navigation
            const loading = {
              ...this.pageFor(matched),
              views: this.page?.views ?? [],
              chain: this.page?.chain ?? [],
              slices: this.page?.slices ?? [],
              data: this.page?.data ?? {},
              view: loadingView,
              status: 'loading',
            };
            if (!this.page) {
              coldLoading = this.createView({
                view: loadingView,
                placement: { parent: null, slot: undefined },
                context: this.root.viewContext(loading),
              });
            }
            await this.renderPage(loading, event);
          }
        }
        this.notify();
      }
    }

    try {
      const resolved = await active.ready;
      if (event.signal.aborted) {
        return;
      }

      if (resolved?.status === 'redirect' && resolved.redirect) {
        if (!precommitRan) {
          // no precommit on this browser: the refused url has shown, its slot becomes the redirect target,
          // a task later so this handler is not aborted by its own replacement
          this.navigator.deferNavigate(resolved.redirect, {
            history: 'replace',
          });
        }
        return;
      }

      if (loadingShownAt !== null && minMs > 0) {
        const elapsed = Date.now() - loadingShownAt;
        if (elapsed < minMs) {
          await wait(minMs - elapsed, {
            abortController: event.signal,
            rejectOnAbort: false,
          });
        }
        if (event.signal.aborted) {
          return;
        }
      }

      if (coldLoading) {
        this.destroyView({ rendered: coldLoading });
        coldLoading = null;
      }
      await this.applyCascade(matched, resolved, event);
    }
    finally {
      if (coldLoading) {
        this.destroyView({ rendered: coldLoading });
      }
    }
  }

  /*******************************
              Cascade
  *******************************/

  // the plain seam
  evaluate(route, fn, context) {
    return isFunction(fn) ? fn(context) : fn;
  }

  // the door a hook rides, with what to do should its answer change. nothing here, since plain
  // data never moves on its own; the reactive scaffold runs the hook again when what it read moves
  // and hands each later answer to changed. kind is guard or slice: a guard runs every navigation,
  // a slice only when its route does. a plugin's own hook rides the same door
  evaluateHook(route, fn, context, { kind, changed }) {
    return this.evaluate(route, fn, context);
  }

  // one seam per hook, each naming its consequence: a redirect moves the page, a refused
  // permission lands as it would at navigation, data replaces its slice, a title its title
  evaluateRedirect(route, fn, context) {
    return this.evaluateHook(route, fn, context, {
      kind: 'guard',
      changed: (target) => this.redirectChanged(route, target),
    });
  }

  evaluatePermission(route, fn, context) {
    return this.evaluateHook(route, fn, context, {
      kind: 'guard',
      changed: (allowed) => this.permissionChanged(route, allowed),
    });
  }

  evaluateData(route, fn, context) {
    return this.evaluateHook(route, fn, context, {
      kind: 'slice',
      changed: (value) => this.updateData(route, value),
    });
  }

  evaluateTitle(route, fn, context) {
    return this.evaluateHook(route, fn, context, {
      kind: 'slice',
      changed: (value) => this.updateTitle(route, value),
    });
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
  async runGuards(matched, navigation) {
    if (!matched) {
      return null;
    }
    const { signal } = navigation;

    const { route, params, query, currentRoutes } = matched;

    for (const ancestor of currentRoutes) {
      if (ancestor.redirect) {
        const target = await this.evaluateRedirect(
          ancestor,
          ancestor.redirect,
          this.contextFor(ancestor, matched, { signal }),
        );
        return {
          status: 'redirect',
          redirect: this.href(target, this.paramsFor(target, params)),
          route,
          params,
          query,
        };
      }
    }

    for (const ancestor of currentRoutes) {
      if (ancestor.permission !== undefined) {
        const allowed = await this.evaluatePermission(
          ancestor,
          ancestor.permission,
          this.contextFor(ancestor, matched, { signal }),
        );
        if (!allowed) {
          if ((!this.user || !this.statusViews?.forbidden) && this.signInRoute) {
            // the return address rides to the sign-in page, which reads it as query.returnTo
            return {
              status: 'redirect',
              redirect: this.href(this.signInRoute, { returnTo: this.returnAddress(matched) }),
              route,
              params,
              query,
            };
          }
          // the routes above the refusing one run their data as a landing would, so their layouts
          // stand with what they read; one of them saying not-found wins, as it does on the data path
          const viewsReady = this.resolveRouteViews(currentRoutes);
          viewsReady.catch(noop);
          const above = currentRoutes.slice(0, currentRoutes.indexOf(ancestor));
          const { data, slices, notFound } = await this.runSlices(above, matched, navigation);
          if (notFound) {
            return this.notFoundResult(matched, viewsReady, { data, slices, signal });
          }
          const [view, views, { title, titles }] = await Promise.all([
            this.resolveView(this.statusViews?.forbidden),
            viewsReady,
            this.evaluateTitles(currentRoutes, matched, { data, slices, signal }),
          ]);
          return this.buildCascadeResult(matched, {
            status: 'forbidden',
            view,
            views,
            data,
            slices,
            title,
            titles,
          });
        }
      }
    }

    return null;
  }

  // one slice per route in chain order. a route runs when the url as it sees it moved, the params
  // and query keys it can see with its ancestors' included, on a reload, or for another user;
  // otherwise it keeps its slice and never runs
  // the slice a route keeps across a navigation: the one it had on the page the navigation leaves,
  // when the url as the route sees it did not move, unless every route runs again, on a reload or
  // for another user
  keptSlice(route, matched, { reload = false, previous = null }) {
    if (!previous || reload || this.dataChanged(previous.user, this.user)) {
      return null;
    }
    const slice = previous.slices?.find((item) => item.route === route);
    return slice && !this.keysMoved(route, previous, matched) ? slice : null;
  }

  async runData(matched, navigation) {
    const { signal } = navigation;
    const { currentRoutes } = matched;

    // the chunks load while the data runs, and a failed chunk waits to throw where the data's turn comes
    const viewsReady = this.resolveRouteViews(currentRoutes);
    viewsReady.catch(noop);

    const { data, slices, notFound } = await this.runSlices(currentRoutes, matched, navigation);
    if (notFound) {
      return this.notFoundResult(matched, viewsReady, { data, slices, signal });
    }
    const views = await viewsReady;
    const titles = slices.map((slice) => slice.title).filter((title) => title !== null);
    return this.buildCascadeResult(matched, {
      status: 'ok',
      view: views.at(-1)?.view ?? null,
      views,
      data,
      slices,
      title: titles.at(-1) ?? '',
      titles,
    });
  }

  // the slices of routes in chain order, each seeing the data of the routes above it: a route keeps
  // the slice it had when the url as it sees it did not move and runs its data otherwise, and one
  // saying not-found ends the walk. the data path walks the whole chain; a refusal walks the routes
  // above the refusing one, so their layouts stand with what they read
  async runSlices(routes, matched, navigation) {
    const { signal } = navigation;
    const data = {};
    const slices = [];
    let flaggedNotFound = false;
    const notFound = () => {
      flaggedNotFound = true;
      return NOT_FOUND;
    };

    for (const route of routes) {
      const kept = this.keptSlice(route, matched, navigation);
      if (kept) {
        slices.push(kept);
        extend(data, kept.data);
        continue;
      }

      let sliceData = {};
      if (route.data !== undefined) {
        const rawData = await this.evaluateData(route, route.data, {
          ...this.contextFor(route, matched, { data: { ...data }, slices: [...slices], signal }),
          notFound,
        });
        if (flaggedNotFound || rawData === NOT_FOUND) {
          return { data, slices, notFound: true };
        }
        if (isPlainObject(rawData)) {
          sliceData = await this.resolveDataSlice(rawData);
        }
      }
      // the slice exists before the title and the routes below run, so they can read it
      const slice = this.sliceOf(route, sliceData);
      extend(data, slice.data);
      if (route.title !== undefined) {
        slice.title = await this.titleOf(route, matched, { data: { ...data }, slices: [...slices, slice], signal });
      }
      slices.push(slice);
    }

    return { data, slices, notFound: false };
  }

  async notFoundResult(matched, viewsReady, { data, slices, signal }) {
    const [views, view, { title, titles }] = await Promise.all([
      viewsReady,
      this.resolveView(this.statusViews?.notFound),
      this.evaluateTitles(matched.currentRoutes, matched, { data, slices, signal }),
    ]);
    return this.buildCascadeResult(matched, { status: 'notFound', view, views, data, slices, title, titles });
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
    const value = await this.evaluateTitle(
      route,
      route.title,
      this.contextFor(route, matched, { data, slices, signal }),
    );
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

  // what each route shows, in chain order: its layout, its view, and the slots it declares by name.
  // whoever renders places them, a route's content filling the nearest slot above it
  async resolveRouteViews(routes) {
    return Promise.all(routes.map(async (route) => {
      const [layout, view] = await Promise.all([this.resolveView(route.layout), this.resolveView(route.view)]);
      const slots = {};
      for (const name of Object.keys(route.slots ?? {})) {
        slots[name] = await this.resolveView(route.slots[name]);
      }
      return { route, layout, view, slots };
    }));
  }

  async resolveDataSlice(rawData) {
    const resolved = {};
    const pending = [];
    each(rawData, (value, key) => {
      if (isPromise(value)) {
        pending.push(value.then((settled) => {
          resolved[key] = settled;
        }));
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
    // the page's write, its settle and its render are one moment to anything watching
    const rendering = this.batch(() => {
      this.page = { ...this.pageFor(matched), ...resolved, chain: matched.chain, key, user: this.user };
      this.settleRoutes(previous, this.page);
      if (key && resolved.status === 'ok') {
        this.entryCache?.set(key, { resolved, user: this.user });
      }
      if (globalThis.document && resolved.title) {
        globalThis.document.title = resolved.title;
      }
      return this.renderPage(this.page, event);
    });
    await rendering;
    this.notify();
  }

  // writes that belong together, one moment to anything watching: nothing here, where nothing
  // watches, and the reactive scaffold's provider holds its notifications to the end
  batch(fn) {
    return fn();
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
        route.activate(page);
        this.onRouteCreated(route, this.lifecycleContext(route, page, previous));
      }
      else if (sliceOf(page, route) !== sliceOf(previous, route)) {
        route.update(page);
        this.onRouteUpdated(route, this.lifecycleContext(route, page, previous));
      }
      else if ((before.at(-1) === route) !== (after.at(-1) === route)) {
        // a kept route at the chain's end shows the page's view, and gives it up when the chain grows
        route.update(page);
      }
      else {
        // a kept route renders a slot again when a route below it took that slot or gave it back
        const crossed = Object.keys(route.slots).filter((slot) =>
          route.slotDeclaredBelow(previous, slot) !== route.slotDeclaredBelow(page, slot)
        );
        if (crossed.length) {
          route.update(page, { slots: crossed });
        }
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
    if ((!this.user || !this.statusViews?.forbidden) && this.signInRoute) {
      this.navigator.navigate(this.href(this.signInRoute, { returnTo: this.returnAddress(this.current) }), {
        history: 'replace',
      });
      return;
    }
    const view = await this.resolveView(this.statusViews?.forbidden);
    this.dropSlices(route);
    await this.updatePage(route, { view, status: 'forbidden', titles: this.page.titles });
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
    await this.updatePage(route);
  }

  // a route's data recomputed outside a navigation: the slice is set, the page re-reads itself and
  // renders, and anything that read the slice follows on its own. notFound() lands as it does at
  // navigation: the not-found view in place, and the route's slice leaves with it, as the route
  // that said not-found never has one. so data arriving for a route without a slice enters it as
  // a fresh navigation would, while an ancestor's data moving on a not-found page only keeps it current
  async updateData(route, value) {
    const page = this.page;
    const slices = page?.slices;
    const slice = slices?.find((item) => item.route === route);
    if (!slice) {
      // on a not-found page the route that said so is the first without a slice, and its data arriving is the reload
      const saidNotFound = page?.status === 'notFound'
        && page.chain?.find((item) => !slices.some((other) => other.route === item)) === route;
      // the standing page is known by its chain: a parent's data moving in the same tick re-reads the
      // page from its slices, which keeps the chain, while a navigation brings a new one
      if (
        saidNotFound && (await value) !== NOT_FOUND && this.page?.chain === page.chain
        && this.page.status === 'notFound'
      ) {
        this.navigator.reload();
      }
      return;
    }
    const version = slice.version = (slice.version ?? 0) + 1;
    // the slice left the page, a navigation moved it, or a newer run landed first: checked after every await
    const stale = () => !inArray(slice, this.page?.slices ?? []) || slice.version !== version;
    const resolved = await value;
    if (stale()) {
      return;
    }
    if (resolved === NOT_FOUND) {
      const view = await this.resolveView(this.statusViews?.notFound);
      if (stale()) {
        return;
      }
      this.dropSlices(route);
      await this.updatePage(route, { view, status: 'notFound', titles: this.page.titles });
      return;
    }
    const data = isPlainObject(resolved) ? await this.resolveDataSlice(resolved) : {};
    if (!stale() && this.setSlice(slice, data)) {
      await this.updatePage(route);
    }
  }

  // sets the slice and says whether it moved, one dataChanged compare. the reactive scaffold
  // writes each key through its cell and lets the cell's equality say
  setSlice(slice, data) {
    if (!this.dataChanged(slice.data, data)) {
      return false;
    }
    slice.data = data;
    return true;
  }

  // the route's slice and those below it leave the page, the shape a page refused or not found at
  // the route has, and their layouts and slots leave with them when the page is re-read
  dropSlices(route) {
    const { slices } = this.page;
    const index = slices.findIndex((slice) => slice.route === route);
    if (index >= 0) {
      slices.splice(index);
    }
  }

  // the page re-read from its slices, which several updates in one tick share, so none of them
  // writes over another's, with whatever else moved: a status swap brings its view and keeps the
  // titles, which name the page refused or not found as they do at navigation. the moved route and
  // the routes below it are told at the render moment, since data flows down
  async updatePage(route, changes = {}) {
    const { slices, chain = [] } = this.page;
    const data = {};
    each(slices, (slice) => extend(data, slice.data));
    const titles = changes.titles ?? slices.map((slice) => slice.title).filter((title) => title !== null);
    const rendering = this.batch(() => {
      this.page = { ...this.page, ...changes, data, title: titles.at(-1) ?? '', titles };
      if (globalThis.document && this.page.title) {
        globalThis.document.title = this.page.title;
      }
      each(chain.slice(chain.indexOf(route)), (moved) => moved.update(this.page));
      return this.renderPage(this.page);
    });
    await rendering;
    this.notify();
  }

  // awaited, so the platform's focus reset and scroll find the new dom. a traverse puts the named
  // containers back here, at the swap, which a view transition's update is part of
  async renderPage(page, event = null) {
    // the chain's leaf shows the page's view, so a view swapped in place, a status view or the
    // loading view, is told here, once, for every path that swaps one
    const leaf = page.chain?.at(-1);
    if (leaf?.rendered && leaf.rendered.page !== page) {
      leaf.update(page);
    }
    await this.onRender?.(page, event);
    if (event?.navigationType === 'traverse' && this.restoreScroll && page.status !== 'loading') {
      this.navigator.restoreScroll(this.navigator.entry);
    }
  }

  /*******************************
                Views
  *******************************/

  // the three seams of anything that appears, no-ops here: native shows nothing on its own. the dom
  // plugin makes them the native how and an integration wraps them for its components. a route runs
  // its own views through them as it activates, is told and deactivates. each takes one bag: the
  // view, where it attaches as placement { parent, slot }, the parent's rendered layout and a slot
  // name, absent for the default slot, the context the view is rendered with, and the rendered
  // view createView returned, an element or a component, which update hands back or replaces and
  // destroy ends. a view's life ends at destroyView, never at its route's signal
  createView({ view, placement, context }) {}

  updateView({ rendered, view, placement, context }) {
    return rendered;
  }

  destroyView({ rendered }) {}

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
