import { solidRouter } from '@nav-router/solid';
import { wait } from '@semantic-ui/utils';
import { lazy } from 'nav-router';

import { members, user } from './store.js';
import { Breadcrumbs } from './views/breadcrumbs.jsx';
import { ErrorPage } from './views/error-page.jsx';
import { ForbiddenPage } from './views/forbidden-page.jsx';
import { HomePage } from './views/home-page.jsx';
import { LoadingPage } from './views/loading-page.jsx';
import { MemberPage } from './views/member-page.jsx';
import { NotFoundPage } from './views/not-found-page.jsx';
import { PrintCrumbs } from './views/print-crumbs.jsx';
import { PrintPage } from './views/print-page.jsx';
import { RootLayout } from './views/root-layout.jsx';
import { SettingsPage } from './views/settings-page.jsx';
import { SignInPage } from './views/sign-in-page.jsx';
import { TeamLayout } from './views/team-layout.jsx';
import { TeamOverviewPage } from './views/team-overview-page.jsx';
import { TeamSidebar } from './views/team-sidebar.jsx';

export const app = solidRouter({
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
  // read once per navigation for the sign-in redirect; the guards read the signal itself
  identity: () => user(),
  holdCommit: '300ms',
  loadingDelay: '200ms',
  loadingMin: '500ms',
  restoreScroll: '#sidebar-scroll',
  meta: { description: 'Acme Console, a Solid app on nav-router' },

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
      // reads the members signal, so every edit reaches the slice and the views that read it
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
          view: lazy(() => import('./views/analytics-page.jsx')),
        },

        settings: {
          path: '/team/:org/settings',
          title: 'Settings',
          // the guard reads the signal, so a sign-out on the standing page lands as forbidden in place
          permission: () => user()?.role === 'admin',
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
