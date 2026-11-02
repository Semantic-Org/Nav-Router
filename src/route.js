import {
  each,
  extend,
  isBoolean,
  isDate,
  isNumber,
  isPlainObject,
  isString,
} from '@semantic-ui/utils';

import { IS_ROUTE, IS_ROUTER } from './internal-helpers/identity.js';

export class Route {

  // brand route
  get [IS_ROUTE]() { return true; }
  static [Symbol.hasInstance](value) { return !!value?.[IS_ROUTE]; }

  static defaults = {
    params: {},
    query: {},
    slots: {},
  };

  constructor(options = {}, parent = null) {
    const { index, routes, ...routeOptions } = options;

    this.parent = parent;
    this.router = parent ? parent.router : (this[IS_ROUTER] ? this : null);
    this.children = [];
    this.indexRoute = null;
    this.active = false;

    if (this.router === this) {
      this.routesByName ??= new Map();
      this.leaves ??= [];
    }

    extend(this, Route.defaults, routeOptions, {
      params: { ...Route.defaults.params, ...routeOptions.params },
      query: { ...Route.defaults.query, ...routeOptions.query },
      slots: { ...Route.defaults.slots, ...routeOptions.slots },
    });

    this.layout ??= this.views?.layout;
    this.path = this.normalizePath(routeOptions.path, parent);
    this.assertPathPrefix(this.path, parent);
    this.id = this.resolveId(routeOptions, parent);
    this.ancestors = parent ? [...parent.ancestors, this] : [this];
    this.segments = this.path === '/' ? [] : this.path.slice(1).split('/');
    this.paramSpecs = this.buildSpecs('params');
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
  // onDestroyed is where that is released

  activate() {
    this.abortController = new AbortController();
    this.abortSignal = this.abortController.signal;
    this.active = true;
  }

  deactivate() {
    this.active = false;
    this.abortController?.abort('Route destroyed');
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
