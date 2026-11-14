/* playground-hide */
// the playground serves this app under a path of its own, set as the router's base before
// router() runs
import './sandbox.js';
/* playground-hide-end */
import '@nav-router/plugins/head';
import { router } from 'nav-router';

import { routes } from './routes.js';

await router({
  mount: '#app',
  ...routes,
  // mirror the iframe's live <head> into the page so you can see the tags change
  onRender() {
    const tags = [...document.head.querySelectorAll('[data-router-head]')]
      .map((el) => el.outerHTML.replace(' data-router-head=""', ''));
    document.querySelector('#head-out').textContent = [`<title>${document.title}</title>`, ...tags].join('\n');
  },
}).start();
