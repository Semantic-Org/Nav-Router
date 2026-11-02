import { router } from '../router.js'

router.index({
  path: '/',
  title: 'Overview',
  data: () => ({ memberCount: Object.keys(MEMBERS).length }),
  view: views.HomePage,
});

router.route({
  name: 'signIn',
  path: '/sign-in',
  title: 'Sign In',
  view: views.SignInPage,
});

router.route({
  name: 'legacyDocs',
  path: '/old-docs',
  redirect: 'home',
});
