/* playground-hide */
// the playground serves this app under a path of its own, set as the router's base before
// router() runs
import './sandbox.js';
/* playground-hide-end */
import { router } from 'nav-router';

import { routes } from './routes.js';

const app = await router({ mount: '#app', ...routes }).start();

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
