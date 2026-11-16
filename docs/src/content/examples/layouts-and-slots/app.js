/* playground-hide */
// the playground serves this app under a path of its own, set as the router's base before
// router() runs
import './sandbox.js';
/* playground-hide-end */
import { isActive, isCurrent, router } from 'nav-router';

import { routes } from './routes.js';

await router({
  mount: '#app',
  ...routes,
  // the layouts stay in the dom across navigations, so active markers update in place
  onRender() {
    for (const a of document.querySelectorAll('[data-active]')) {
      a.toggleAttribute('data-on', isActive(a.dataset.active));
    }
    for (const a of document.querySelectorAll('[data-current]')) {
      const args = a.dataset.user ? { userId: a.dataset.user } : null;
      if (isCurrent(a.dataset.current, args)) { a.setAttribute('aria-current', 'page'); }
      else { a.removeAttribute('aria-current'); }
    }
  },
}).start();
