import { href } from 'nav-router';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const Layout = () => `
  <header>
    <a href="${href('home')}">Home</a>
    <a href="${href('report', { speed: 'fast' })}">Fast (100ms)</a>
    <a href="${href('report', { speed: 'medium' })}">Medium (400ms)</a>
    <a href="${href('report', { speed: 'slow' })}">Slow (1.2s)</a>
  </header>
  <slot></slot>`;

const DELAY = { fast: 100, medium: 400, slow: 1200 };

export const routes = {
  name: 'home',
  layout: Layout,
  statusViews: {
    loading: () => '<p class="loading">Loading the report…</p>',
  },
  index: {
    path: '/',
    view: () => '<h1>Reports</h1><p>Open a report at each speed and watch the URL.</p>',
  },
  routes: {
    report: {
      path: '/reports/:speed',
      params: { speed: { allowed: ['fast', 'medium', 'slow'] } },
      data: async ({ params }) => {
        await wait(DELAY[params.speed]);
        return { speed: params.speed, ms: DELAY[params.speed] };
      },
      view: ({ data }) => `
        <h1>The ${data.speed} report</h1>
        <p>Its data took ${data.ms}ms.</p>`,
    },
  },
};
