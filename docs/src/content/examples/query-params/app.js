/* playground-hide */
// the playground serves this app under a path of its own, set as the router's base before
// router() runs
import './sandbox.js';
/* playground-hide-end */
import { router, update } from 'nav-router';

import { routes } from './routes.js';

const app = await router({ mount: '#app', ...routes }).start();

// the toggle changes the current page's query in place
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-toggle-compact]')) {
    update({ compact: !app.current.query.compact || undefined });
  }
});
