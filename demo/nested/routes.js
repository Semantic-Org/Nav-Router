import { MEMBERS } from './data.js';
import { router } from './router.js';
import { HomePage } from './views/home-page.js';
import { SignInPage } from './views/sign-in-page.js';

import './team/routes.js';

router.index({
  path: '/',
  title: 'Overview',
  data: () => ({ memberCount: Object.keys(MEMBERS).length }),
  view: HomePage,
});

router.route({
  name: 'signIn',
  path: '/sign-in',
  title: 'Sign In',
  view: SignInPage,
});

router.route({
  name: 'legacyDocs',
  path: '/old-docs',
  redirect: 'home',
});

export { router };

