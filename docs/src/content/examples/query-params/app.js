import { Router, router, update } from 'nav-router';
import dom from 'nav-router/plugins/dom';

import { routes } from './routes.js';

/* playground-hide */
// the sandbox serves this app under a session path, which is the router's base
const base = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
/* playground-hide-end */

Router.extend(dom, { mount: '#app' });

const app = router({ base, ...routes });
await app.start();

// the toggle changes the current page's query in place
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-toggle-compact]')) {
    update({ compact: !app.current.query.compact || undefined });
  }
});
