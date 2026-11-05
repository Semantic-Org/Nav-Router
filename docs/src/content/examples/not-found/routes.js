import { href } from 'nav-router';

const PEOPLE = { ada: 'Ada Park', mo: 'Mo Reyes' };

const Layout = () => `
  <header>
    <a href="${href('home')}">Team</a>
    <a href="${href('member', { userId: 'ada' })}">Ada</a>
    <a href="${href('member', { userId: 'zed' })}">Zed (no such person)</a>
    <a href="${href('home')}/nowhere">Nowhere (no such page)</a>
  </header>
  <slot></slot>`;

export const routes = {
  name: 'home',
  layout: Layout,
  statusViews: {
    notFound: () => '<h1>Not found</h1><p>Nothing lives here. Pick someone above.</p>',
  },
  index: {
    path: '/',
    view: () =>
      '<h1>Team</h1><p>Ada exists. Zed matches the route, but there is no one behind the param. No route matches Nowhere at all.</p>',
  },
  routes: {
    member: {
      path: '/people/:userId',
      data: ({ params, notFound }) => (PEOPLE[params.userId] ? { name: PEOPLE[params.userId] } : notFound()),
      view: ({ data }) => `<h1>${data.name}</h1><p>Found.</p>`,
    },
  },
};
