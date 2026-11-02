import { each, extend } from '@semantic-ui/utils';
import { IS_ROUTE } from './helpers/identity.js';

export class Route {

  // brand route
  get [IS_ROUTE]() { return true; }
  static [Symbol.hasInstance](value) { return !!value?.[IS_ROUTE]; }

  static defaults = {
    params: {},
    query: {},
    slots: {},
  };

  constructor(options, parent = null) {
    // merge Route.defaults and options, assert path starts with parent.path, and flatten ancestor chain
    // register named route on root router if name is defined
    // normalize inline options.index and options.routes through index(), section(), and route()
  }

  /*******************************
             Structure
  *******************************/

  index(options) {
    // create child Route defaulting path to this.path and bind as default stem leaf for this.name
    // push to this.children and return child Route
  }

  section(options) {
    // create child Route container for shared layout, slots, params, query, permission, and data
    // push to this.children and return section Route
  }

  route(options) {
    // create matchable leaf Route with full grep-able path and inherited ancestor chain
    // push to this.children and return leaf Route
  }
}

export const route = (options, parent) => new Route(options, parent);
