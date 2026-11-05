import { getRouter } from './router.js';

// the leaf itself, with these args
export const isCurrent = (target, args = null) => {
  const instance = getRouter();
  const route = instance.routeFor(target);
  if (!route || instance.current?.route !== route) {
    return false;
  }
  return args === null || instance.argsMatch(route, args);
};
