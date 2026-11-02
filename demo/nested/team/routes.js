import { router } from '../router.js'

const team = router.section({
  name: 'team',
  path: '/team/:org',
  params: { org: 'acme' },
  title: ({ params }) => `Team ${params.org.toUpperCase()}`,
  layout: views.TeamLayout,
  slots: { sidebar: views.TeamSidebar },
});

team.index({
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
});

const member = team.route({
  name: 'member',
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
});

const analytics = team.route({
  name: 'analytics',
  path: '/team/:org/analytics',
  title: 'Analytics',
  data: ({ params, signal }) => ({
    org: params.org,
    latency: wait(400, { signal }).then(() => '14ms'),
    uptime: wait(900, { signal }).then(() => '99.98%'),
    throughput: wait(1500, { signal }).then(() => '18.4k req/s'),
  }),
  view: () => Promise.resolve({ default: views.AnalyticsPage }),
});

const settings = team.route({
  name: 'settings',
  path: '/team/:org/settings',
  title: 'Settings',
  permission: ({ user }) => user?.role === 'admin',
  view: views.SettingsPage,
});
