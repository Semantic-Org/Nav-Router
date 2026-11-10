import { lazy, router } from '@nav-router/vue';
import { wait } from '@semantic-ui/utils';

import { members, user } from './store.js';
import Breadcrumbs from './views/breadcrumbs.vue';
import ErrorPage from './views/error-page.vue';
import ForbiddenPage from './views/forbidden-page.vue';
import HomePage from './views/home-page.vue';
import LoadingPage from './views/loading-page.vue';
import MemberPage from './views/member-page.vue';
import NotFoundPage from './views/not-found-page.vue';
import PrintCrumbs from './views/print-crumbs.vue';
import PrintPage from './views/print-page.vue';
import RootLayout from './views/root-layout.vue';
import SettingsPage from './views/settings-page.vue';
import SignInPage from './views/sign-in-page.vue';
import TeamLayout from './views/team-layout.vue';
import TeamOverviewPage from './views/team-overview-page.vue';
import TeamSidebar from './views/team-sidebar.vue';

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
  // read once per navigation for the sign-in redirect; the guards read the ref itself
  identity: () => user.value,
  holdCommit: '300ms',
  loadingDelay: '200ms',
  loadingMin: '500ms',
  restoreScroll: '#sidebar-scroll',
  meta: { description: 'Acme Console, a Vue app on nav-router' },

  index: {
    path: '/',
    title: 'Overview',
    data: () => ({ memberCount: members().length }),
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
      // reads the reactive members, so every edit reaches the slice and the views that read it
      data: ({ params }) => ({ members: members().filter((member) => member.org === params.org) }),

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
          view: lazy(() => import('./views/analytics-page.vue')),
        },

        settings: {
          path: '/team/:org/settings',
          title: 'Settings',
          // the guard reads the ref, so a sign-out on the standing page lands as forbidden in place
          permission: () => user.value?.role === 'admin',
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
