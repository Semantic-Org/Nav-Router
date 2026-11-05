import { wait } from '@semantic-ui/utils';
import { lazy, router } from 'nav-router';

import { MEMBERS } from './data.js';
import { ErrorPage } from './views/error-page.js';
import { ForbiddenPage } from './views/forbidden-page.js';
import { HomePage } from './views/home-page.js';
import { LoadingPage } from './views/loading-page.js';
import { MemberPage } from './views/member-page.js';
import { NotFoundPage } from './views/not-found-page.js';
import { RootLayout } from './views/root-layout.js';
import { SettingsPage } from './views/settings-page.js';
import { SignInPage } from './views/sign-in-page.js';
import { TeamLayout } from './views/team-layout.js';
import { TeamOverviewPage } from './views/team-overview-page.js';
import { TeamSidebar } from './views/team-sidebar.js';

export const app = router({
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
  preload: 'intent',
  restoreScroll: '#sidebar-scroll',

  index: {
    path: '/',
    title: 'Overview',
    data: () => ({ memberCount: Object.keys(MEMBERS).length }),
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
      params: { org: 'acme' },
      title: ({ params }) => `Team ${params.org.toUpperCase()}`,
      layout: TeamLayout,
      slots: { sidebar: TeamSidebar },

      index: {
        path: '/team/:org/:tab',
        params: {
          tab: { default: 'overview', allowed: ['overview', 'members', 'activity'] },
        },
        query: {
          compact: false,
        },
        title: ({ params }) => `${params.tab[0].toUpperCase()}${params.tab.slice(1)}`,
        data: () => ({ members: Object.values(MEMBERS) }),
        view: TeamOverviewPage,
      },

      routes: {
        member: {
          path: '/team/:org/:userId',
          params: {
            userId: String,
          },
          query: {
            section: { default: 'profile', allowed: ['profile', 'commits', 'permissions'] },
          },
          data: ({ params, notFound }) => (
            MEMBERS[params.userId]
              ? { member: MEMBERS[params.userId] }
              : notFound()
          ),
          title: ({ data }) => data.member?.name ?? 'Member',
          view: MemberPage,
        },

        analytics: {
          path: '/team/:org/analytics',
          title: 'Analytics',
          data: ({ params, signal }) => ({
            org: params.org,
            latency: wait(400, { abortController: signal }).then(() => '14ms'),
            uptime: wait(900, { abortController: signal }).then(() => '99.98%'),
            throughput: wait(1500, { abortController: signal }).then(() => '18.4k req/s'),
          }),
          view: lazy(() => import('./views/analytics-page.js')),
        },

        settings: {
          path: '/team/:org/settings',
          title: 'Settings',
          permission: ({ user }) => user?.role === 'admin',
          view: SettingsPage,
        },
      },
    },

    legacyDocs: {
      path: '/old-docs',
      redirect: 'home',
    },
  },
});
