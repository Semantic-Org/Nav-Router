import '@nav-router/plugins/dom';
import { router } from 'nav-router';

import { routes } from './routes.js';

/* playground-hide */
// the sandbox serves this app under a session path, which is the router's base
const base = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
/* playground-hide-end */

const app = router({ base, mount: '#app', ...routes });
await app.start();
