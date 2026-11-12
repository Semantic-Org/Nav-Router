import { lazy, router } from '@nav-router/svelte';
import { wait } from '@semantic-ui/utils';

import { store } from './store.svelte.js';
import Breadcrumbs from './views/breadcrumbs.svelte';
import ErrorPage from './views/error-page.svelte';
import ForbiddenPage from './views/forbidden-page.svelte';
import HomePage from './views/home-page.svelte';
import LoadingPage from './views/loading-page.svelte';
import MemberPage from './views/member-page.svelte';
import NotFoundPage from './views/not-found-page.svelte';
import PrintCrumbs from './views/print-crumbs.svelte';
import PrintPage from './views/print-page.svelte';
import RootLayout from './views/root-layout.svelte';
import SettingsPage from './views/settings-page.svelte';
import SignInPage from './views/sign-in-page.svelte';
import TeamLayout from './views/team-layout.svelte';
import TeamOverviewPage from './views/team-overview-page.svelte';
import TeamSidebar from './views/team-sidebar.svelte';

export const app = router({
  name: 'home',
  mount: '#app',
  title: 'Acme Console',
  layout: RootLayout,
  slots: { breadcrumbs: Breadcrumbs },
  statusViews: {
    notFound: NotFoundPage,
    forbidden: ForbiddenPage,
    loading: LoadingPage,
    error: ErrorPage,
  },
  signInRoute: 'signIn',
  // read once per navigation for the sign-in redirect; the guards read the state itself
  identity: () => store.user,
  holdCommit: '300ms',
  loadingDelay: '200ms',
  loadingMin: '500ms',
  restoreScroll: '#sidebar-scroll',
  meta: { description: 'Acme Console, a Svelte app on nav-router' },

  index: {
    path: '/',
    title: 'Overview',
    data: () => ({ memberCount: store.members.length }),
    view: HomePage,
  },

  routes: {
    signIn: {
      path: '/sign-in',
      title: 'Sign In',
      view: SignInPage,
    },

    team: {
      path: '/team/:org',
      params: { org: { default: 'acme', allowed: ['acme', 'globex'] } },
      title: ({ params }) => `Team ${params.org}`,
      layout: TeamLayout,
      slots: { sidebar: TeamSidebar },
      // reads the members, so every edit reaches the slice and the views that read it
      data: ({ params }) => ({ members: store.members.filter((member) => member.org === params.org) }),

      index: {
        path: '/team/:org/:tab',
        params: { tab: { default: 'overview', allowed: ['overview', 'members', 'activity'] } },
        title: ({ params }) => params.tab[0].toUpperCase() + params.tab.slice(1),
        view: TeamOverviewPage,
      },

      routes: {
        member: {
          path: '/team/:org/m/:id',
          query: { section: { default: 'profile', allowed: ['profile', 'activity'] } },
          // reads the team's slice, so a removal lands as not-found in place and a restore reloads
          data: ({ params, data, notFound }) => {
            const member = data.members.find((candidate) => candidate.id === params.id);
            return member ? { member } : notFound();
          },
          title: ({ data }) => data.member?.name,
          meta: ({ data }) => ({
            description: `${data.member?.name ?? 'A member'} of ${data.member?.org ?? 'the team'}`,
          }),
          view: MemberPage,
        },

        analytics: {
          path: '/team/:org/analytics',
          title: 'Analytics',
          data: ({ params, signal }) => ({
            org: params.org,
            latency: wait(1200, { abortController: signal }).then(() => '14ms'),
            uptime: wait(1800, { abortController: signal }).then(() => '99.98%'),
          }),
          view: lazy(() => import('./views/analytics-page.svelte')),
        },

        settings: {
          path: '/team/:org/settings',
          title: 'Settings',
          // the guard reads the user, so a change of who is signed in lands on the standing page: forbidden
          // in place for a member, the sign-in page for nobody
          permission: () => store.user?.role === 'admin',
          view: SettingsPage,
        },

        print: {
          path: '/team/:org/print',
          title: 'Print',
          // no sidebar, and its own trail in the root's breadcrumbs slot, across the team layout
          slots: { sidebar: null, breadcrumbs: PrintCrumbs },
          view: PrintPage,
        },
      },
    },

    legacyDocs: {
      path: '/old-docs',
      redirect: 'home',
    },
  },
});
