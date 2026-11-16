/* playground-hide */
// the playground serves this app under a path of its own, set as the router's base before
// router() runs
import './sandbox.js';
/* playground-hide-end */
import '@nav-router/plugins/preload-intent';
import { router } from 'nav-router';

import { routes } from './routes.js';

document.addEventListener('chunk-ready', (e) => {
  const badge = document.querySelector('#chunk');
  if (badge) { badge.textContent = `report.js warmed at ${e.detail}ms`; }
});

await router({ mount: '#app', ...routes }).start();
