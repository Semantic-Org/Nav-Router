import { wait } from '@semantic-ui/utils';

import { MEMBERS } from '../data.js';
import { router } from '../router.js';
import { MemberPage } from './views/member-page.js';
import { SettingsPage } from './views/settings-page.js';
import { TeamLayout } from './views/team-layout.js';
import { TeamOverviewPage } from './views/team-overview-page.js';
import { TeamSidebar } from './views/team-sidebar.js';

export const team = router.section({
  name: 'team',
  path: '/team/:org',
  params: { org: 'acme' },
  title: ({ params }) => `Team ${params.org.toUpperCase()}`,
  layout: TeamLayout,
  slots: { sidebar: TeamSidebar },
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
  view: TeamOverviewPage,
});

export const member = team.route({
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
  view: MemberPage,
});

export const analytics = team.route({
  name: 'analytics',
  path: '/team/:org/analytics',
  title: 'Analytics',
  data: ({ params, signal }) => ({
    org: params.org,
    latency: wait(400, { abortController: signal }).then(() => '14ms'),
    uptime: wait(900, { abortController: signal }).then(() => '99.98%'),
    throughput: wait(1500, { abortController: signal }).then(() => '18.4k req/s'),
  }),
  view: () => import('./views/analytics-page.js'),
});

export const settings = team.route({
  name: 'settings',
  path: '/team/:org/settings',
  title: 'Settings',
  permission: ({ user }) => user?.role === 'admin',
  view: SettingsPage,
});
