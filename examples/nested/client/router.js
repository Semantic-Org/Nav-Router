import { router as defineRouter } from 'nav-router';

import { ErrorPage } from './views/error-page.js';
import { ForbiddenPage } from './views/forbidden-page.js';
import { LoadingPage } from './views/loading-page.js';
import { NotFoundPage } from './views/not-found-page.js';
import { RootLayout } from './views/root-layout.js';

export const router = defineRouter({
  name: 'home',
  title: 'Acme Console',
  layout: RootLayout,
  statusViews: {
    notFound: NotFoundPage,
    forbidden: ForbiddenPage,
    loading: LoadingPage,
    error: ErrorPage,
  },
  signInRoute: 'signIn',
  holdCommit: '300ms',
  loadingDelay: '200ms',
  loadingMin: '500ms',
  restoreScroll: '#sidebar-scroll',
});
