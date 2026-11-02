import { each } from '@semantic-ui/utils';

import { router } from './router.js';

// the same page with some of its args moved: a filter typed into, a tab chosen. the url is
// replaced and neither scroll nor focus resets, so the control keeps the user's place. an
// undefined value removes its key
export const update = (args = {}, options = {}) => {
  const instance = router();
  const route = instance.current?.route;
  if (!route) {
    return instance.navigator.catchNavigation();
  }
  const merged = { ...instance.current.params, ...instance.current.query, ...args };
  each(merged, (value, key) => {
    if (value === undefined) {
      delete merged[key];
    }
  });
  return instance.navigate(route, merged, { ...options, history: 'replace', resetScroll: false, resetFocus: false });
};
