const app = router({
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

  index: {
    path: '/',
    title: 'Overview',
    data: () => ({ memberCount: Object.keys(MEMBERS).length }),
    view: views.HomePage,
  },

  routes: {
    signIn: {
      path: '/sign-in',
      title: 'Sign In',
      view: views.SignInPage,
    },

    team: {
      path: '/team/:org',
      params: { org: 'acme' },
      title: ({ params }) => `Team ${params.org.toUpperCase()}`,
      layout: views.TeamLayout,
      slots: { sidebar: views.TeamSidebar },

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
        view: views.TeamOverviewPage,
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
          view: views.MemberPage,
        },

        analytics: {
          path: '/team/:org/analytics',
          title: 'Analytics',
          data: ({ params, signal }) => ({
            org: params.org,
            latency: wait(400, { signal }).then(() => '14ms'),
            uptime: wait(900, { signal }).then(() => '99.98%'),
            throughput: wait(1500, { signal }).then(() => '18.4k req/s'),
          }),
          view: () => Promise.resolve({ default: views.AnalyticsPage }),
        },

        settings: {
          path: '/team/:org/settings',
          title: 'Settings',
          permission: ({ user }) => user?.role === 'admin',
          view: views.SettingsPage,
        },
      },
    },

    legacyDocs: {
      path: '/old-docs',
      redirect: 'home',
    },
  },
});
