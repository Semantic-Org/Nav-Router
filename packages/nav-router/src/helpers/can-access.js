import { each, isFunction, isPromise } from '@semantic-ui/utils';

import { getRouter } from './router.js';

const defaultParams = (route) => {
  const params = {};
  each(route.paramSpecs, (spec, key) => {
    if (spec.default !== undefined) {
      params[key] = spec.default;
    }
  });
  return params;
};

// the door a menu needs: may this user enter the route. sync guards answer at once, an async
// guard answers as a promise, so a menu that must be sync writes sync guards. a plain read, not
// the cascade: no reactive run is created here
export const canAccess = (target, args = {}) => {
  const instance = getRouter();
  const route = instance.routeFor(target);
  if (!route) {
    return false;
  }
  const { params, query } = instance.splitArgs(route, args);
  const matched = {
    route,
    params: { ...defaultParams(route), ...params },
    query,
    routes: route.ancestors,
  };
  const results = [];
  for (const ancestor of route.ancestors) {
    if (ancestor.permission !== undefined) {
      results.push(
        isFunction(ancestor.permission)
          ? ancestor.permission(instance.contextFor(ancestor, matched))
          : ancestor.permission,
      );
    }
  }
  if (results.some(isPromise)) {
    return Promise.all(results).then((values) => values.every(Boolean));
  }
  return results.every(Boolean);
};
