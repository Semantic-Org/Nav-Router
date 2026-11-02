import { IS_LAZY } from '../internal-helpers/identity.js';

// marks a thunk as a view to load on first use, so a plain function stays a view and nothing has
// to be called to find out which it is. the load runs once, shared by a preload and the navigation
export const lazy = (load) => {
  let loading = null;
  const thunk = () => (loading ??= Promise.resolve()
    .then(load)
    .then(
      (module) => module?.default ?? module,
      (error) => {
        loading = null;
        throw error;
      },
    ));
  thunk[IS_LAZY] = true;
  return thunk;
};

export const isLazy = (value) => Boolean(value?.[IS_LAZY]);
