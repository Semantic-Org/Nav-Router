/* playground-hide */
// the playground serves this app under a path of its own, set as the router's base before
// router() runs
import './sandbox.js';
/* playground-hide-end */
import { router } from 'nav-router';

import { routes } from './routes.js';

await router({ mount: '#app', ...routes }).start();
