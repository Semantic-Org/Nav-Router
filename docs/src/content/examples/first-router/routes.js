import { Layout } from './layout.js';

const PEOPLE = { ada: 'Ada Park', mo: 'Mo Reyes' };

export const routes = {
  name: 'home',
  layout: Layout,
  index: {
    path: '/',
    view: () => `
      <h1>Team</h1>
      <p>Two people. Each link above is built by
        <code>href()</code> from a route name.</p>`,
  },
  routes: {
    member: {
      path: '/people/:userId',
      view: ({ params }) => `
        <h1>${PEOPLE[params.userId]}</h1>
        <p><code>params.userId</code> is <code>${params.userId}</code>.</p>`,
    },
  },
};
