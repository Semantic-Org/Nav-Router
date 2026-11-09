import { inArray, isString } from '@semantic-ui/utils';

import { getRouter } from './router.js';

// in the committed routes, the url's truth: a section is active while any page under it shows,
// so a name resolves to the section itself and not to its index page
export const isActive = (target, args = null) => {
  const instance = getRouter();
  const route = (isString(target) && instance.routesByName.get(target)) || instance.routeFor(target);
  const routes = instance.current?.routes ?? [];
  if (!route || !inArray(route, routes)) {
    return false;
  }
  return args === null || instance.argsMatch(route, args);
};
