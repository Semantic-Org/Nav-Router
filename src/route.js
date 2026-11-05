import { each, extend, inArray, isBoolean, isDate, isNumber, isPlainObject, isString } from '@semantic-ui/utils';

import { IS_ROUTE } from './internal-helpers/identity.js';

export class Route {
  // brand route
  get [IS_ROUTE]() {
    return true;
  }
  static [Symbol.hasInstance](value) {
    return !!value?.[IS_ROUTE];
  }

  static defaults = {
    params: {},
    query: {},
    slots: {},
  };

  // the root is made by its router, with no parent; every route below takes the router from its parent
  constructor(options = {}, parent = null, router = parent?.router ?? null) {
    const { index, routes, ...routeOptions } = options;

    this.parent = parent;
    this.router = router;
    this.children = [];
    this.indexRoute = null;
    this.active = false;

    extend(this, Route.defaults, routeOptions, {
      params: { ...Route.defaults.params, ...routeOptions.params },
      query: { ...Route.defaults.query, ...routeOptions.query },
      slots: { ...Route.defaults.slots, ...routeOptions.slots },
    });

    this.path = this.normalizePath(routeOptions.path, parent);
    this.assertPathPrefix(this.path, parent);
    this.id = this.resolveId(routeOptions, parent);
    this.ancestors = parent ? [...parent.ancestors, this] : [this];
    this.segments = this.path === '/' ? [] : this.path.slice(1).split('/');
    this.paramSpecs = this.buildSpecs('params');
    // every :name in the path is a param, a String unless declared, and the rest segment is one named '*', last only
    each(this.segments, (segment) => {
      const name = segment === '*' ? '*' : (segment.startsWith(':') ? segment.slice(1).replace(/\?$/, '') : null);
      if (name) {
        this.paramSpecs[name] ??= { type: String, default: undefined, allowed: undefined };
      }
    });
    this.querySpecs = this.buildSpecs('query');

    if (this.name && this.router && (!this.isIndex || !this.router.routesByName.has(this.name))) {
      this.router.routesByName.set(this.name, this);
    }

    if (index) {
      this.index(index);
    }

    if (routes) {
      each(routes, (childOptions, key) => {
        const namedOptions = isString(key) && !childOptions.name
          ? { name: key, ...childOptions }
          : childOptions;
        if (this.isSectionConfig(namedOptions)) {
          this.section(namedOptions);
        }
        else {
          this.route(namedOptions);
        }
      });
    }

    if (this.isLeaf && this.router) {
      this.router.leaves.push(this);
    }
  }

  normalizePath(rawPath, parent) {
    if (!rawPath) {
      return parent?.path ?? '/';
    }
    const withLeading = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    return withLeading.length > 1 && withLeading.endsWith('/')
      ? withLeading.slice(0, -1)
      : withLeading;
  }

  assertPathPrefix(path, parent) {
    if (parent?.path && parent.path !== '/' && path !== parent.path && !path.startsWith(`${parent.path}/`)) {
      throw new Error(`Route: path "${path}" must start with parent path "${parent.path}".`);
    }
  }

  resolveId(routeOptions, parent) {
    if (routeOptions.id) {
      return routeOptions.id;
    }
    if (this.isIndex && parent) {
      return routeOptions.name && routeOptions.name !== parent.name
        ? routeOptions.name
        : `${parent.id}:index`;
    }
    return this.name || this.path;
  }

  buildSpecs(field) {
    const specs = {};
    each(this.ancestors, (ancestor) => {
      each(ancestor[field], (rawSpec, key) => {
        specs[key] = this.normalizeSpec(rawSpec);
      });
    });
    return specs;
  }

  normalizeSpec(spec) {
    if (spec === String || spec === Number || spec === Boolean || spec === Date) {
      return { type: spec, default: undefined, allowed: undefined };
    }
    if (isPlainObject(spec)) {
      const sample = spec.default !== undefined ? spec.default : spec.allowed?.[0];
      return {
        type: spec.type ?? this.inferType(sample),
        default: spec.default,
        allowed: spec.allowed,
        validator: spec.validator,
      };
    }
    return {
      type: this.inferType(spec),
      default: spec,
      allowed: undefined,
    };
  }

  inferType(value) {
    if (isBoolean(value)) { return Boolean; }
    if (isNumber(value)) { return Number; }
    if (isDate(value)) { return Date; }
    return String;
  }

  isSectionConfig(config) {
    return Boolean(
      config.index
        || config.routes
        || (config.layout && !config.view && !config.redirect),
    );
  }

  /*******************************
            Active Life
  *******************************/

  // a route's active life is its signal: whatever it stores while active hangs on it, and
  // onDestroyed is where that is released. what it shows lives with it too: its layout, its named
  // slot content and, as the chain's leaf, the page's view go through the router's seams when it
  // activates, are told when it or the data above it moves, and are destroyed when it deactivates.
  // rendered mirrors those three declarations with what the seams returned, a rendered element or
  // component, and the page they were rendered for

  activate(page) {
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
    this.active = true;
    this.rendered = { page: null, slots: {} };
    this.render(page);
  }

  deactivate() {
    this.active = false;
    this.destroyViews();
    this.abortController?.abort('Route destroyed');
  }

  // told which slots, only those are rendered again: an override below entered or left
  update(page, { slots } = {}) {
    if (slots) {
      this.renderSlots(page, slots);
    }
    else {
      this.render(page);
    }
  }

  // each of the route's views through its seam: new, it is created, otherwise it is told. the
  // page's view swaps in place, a page going not-found, so one rendered for another page leaves
  // first. a layout that came back from its update as a new one has what hung inside it, this
  // route's own content and every route below, leave and come back
  render(page) {
    const { rendered } = this;
    const { layout, slots } = page.views?.find((entry) => entry.route === this) ?? {};
    const context = () => this.viewContext(page);
    const layoutBefore = rendered.layout;
    rendered.layout = this.createOrUpdateView({
      prior: rendered.layout,
      view: layout,
      placement: { parent: this.parentLayout(), slot: undefined },
      context,
    });
    if (layoutBefore !== undefined && rendered.layout !== layoutBefore) {
      const chain = page.chain ?? [];
      each([...chain.slice(chain.indexOf(this) + 1)].reverse(), (below) => below.destroyViews());
      this.destroyViews({ keepLayout: true });
      each(chain.slice(chain.indexOf(this) + 1), (below) => below.render(page));
    }
    const parent = rendered.layout ?? this.parentLayout();
    this.renderSlots(page, Object.keys(slots ?? {}));
    if (page.chain?.at(-1) === this) {
      if (rendered.view && rendered.page?.view !== page.view) {
        this.router.destroyView({ rendered: rendered.view });
        rendered.view = undefined;
      }
      rendered.view = this.createOrUpdateView({
        prior: rendered.view,
        view: page.view,
        placement: { parent, slot: undefined },
        context,
      });
    }
    rendered.page = page;
  }

  // the named slots through their seams. a slot a route below declares is the route below's to fill,
  // nearest to the leaf winning, and an explicit empty, null or false, is a declaration too: the
  // slot shows its own fallback
  renderSlots(page, names) {
    const { slots = {} } = page.views?.find((entry) => entry.route === this) ?? {};
    const parent = this.rendered.layout ?? this.parentLayout();
    const context = () => this.viewContext(page);
    each(names, (slot) => {
      const view = this.slotDeclaredBelow(page.chain ?? [], slot) ? null : slots[slot];
      this.rendered.slots[slot] = this.createOrUpdateView({
        prior: this.rendered.slots[slot],
        view,
        placement: { parent, slot },
        context,
      });
    });
  }

  // whether a route below this one in the chain declares the slot, an explicit empty included
  slotDeclaredBelow(chain, slot) {
    return chain.slice(chain.indexOf(this) + 1).some((other) => slot in other.slots);
  }

  // prior is the rendered view as it stands, context a thunk built only for a view that is created or told
  createOrUpdateView({ prior, view, placement, context }) {
    if (!view) {
      if (prior) {
        this.router.destroyView({ rendered: prior });
      }
      return undefined;
    }
    return prior
      ? this.router.updateView({ rendered: prior, view, placement, context: context() })
      : this.router.createView({ view, placement, context: context() });
  }

  // view first, layout last; the layout stays when what hung inside it is to come back
  destroyViews({ keepLayout = false } = {}) {
    const { layout, slots, view } = this.rendered ?? {};
    each([view, ...Object.values(slots ?? {}), keepLayout ? null : layout], (rendered) => {
      if (rendered) {
        this.router.destroyView({ rendered });
      }
    });
    this.rendered = { ...this.rendered, slots: {}, view: undefined, layout: keepLayout ? layout : undefined };
  }

  // the nearest rendered layout above this route, or null for the mount
  parentLayout() {
    let route = this.parent;
    while (route && !route.rendered?.layout) {
      route = route.parent;
    }
    return route?.rendered.layout ?? null;
  }

  // what a view sees: the page's params and query, and the data of this route and the routes above it
  viewContext(page) {
    const slices = (page.slices ?? []).filter((slice) => inArray(slice.route, this.ancestors));
    const data = {};
    each(slices, (slice) => extend(data, slice.data));
    return { ...this.router.contextFor(this, page, { data, slices }), page };
  }

  timeout(fn, ms) {
    const id = setTimeout(fn, ms);
    this.abortSignal?.addEventListener('abort', () => clearTimeout(id), { once: true });
    return id;
  }

  interval(fn, ms) {
    const id = setInterval(fn, ms);
    this.abortSignal?.addEventListener('abort', () => clearInterval(id), { once: true });
    return id;
  }

  /*******************************
             Structure
  *******************************/

  index(options = {}) {
    const child = new Route({
      path: this.path,
      name: this.name,
      ...options,
      isIndex: true,
      isLeaf: true,
    }, this);
    this.indexRoute = child;
    this.children.push(child);
    return child;
  }

  section(options = {}) {
    const child = new Route({ ...options, isSection: true, isLeaf: false }, this);
    this.children.push(child);
    return child;
  }

  route(options = {}) {
    const child = new Route({ ...options, isLeaf: true }, this);
    this.children.push(child);
    return child;
  }
}

export const route = (options, parent) => new Route(options, parent);
