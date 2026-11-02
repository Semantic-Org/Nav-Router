import { router as defineRouter } from 'nav-router'

const router = defineRouter({
  name: 'home',
  title: 'Acme Console',
  views: {
    layout: views.RootLayout,
    notFound: views.NotFoundPage,
    forbidden: views.ForbiddenPage,
    loading: views.LoadingPage,
  },
  signInRoute: 'signIn',
  holdCommit: '300ms',
  loadingDelay: '200ms',
  loadingMin: '500ms',
  preload: 'intent',
  restoreScroll: '#sidebar-scroll',
});
