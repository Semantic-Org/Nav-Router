import 'nav-router/plugins/dom';
import { router } from 'nav-router';

import { routes } from './routes.js';

/* playground-hide */
// the sandbox serves this app under a session path, which is the router's base
const base = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
/* playground-hide-end */

const app = router({ base, mount: '#app', ...routes });
await app.start();

const USERS = {
  member: { name: 'Mo', role: 'member' },
  admin: { name: 'Ada', role: 'admin' },
  none: null,
};

// signing in sets the user the guards read, then goes back where the guard sent you from (or to
// settings, the page this example guards); signing out goes home
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-sign-in]');
  if (!button) { return; }
  app.user = USERS[button.dataset.signIn];
  const returnTo = new URL(location.href).searchParams.get('returnTo');
  if (button.dataset.signIn === 'none') { app.navigate('home'); }
  else { app.navigate(returnTo ?? 'settings'); }
});
