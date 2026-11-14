import { href, lazy } from 'nav-router';

const Layout = () => `
  <header>
    <a href="${href('home')}">Home</a>
    <a href="${href('report')}">Quarterly report</a>
    <span id="chunk" class="muted">${
  window.reportLoadedAt ? `report.js warmed at ${window.reportLoadedAt}ms` : 'report.js: not loaded'
}</span>
  </header>
  <slot></slot>`;

export const routes = {
  name: 'home',
  layout: Layout,
  index: {
    path: '/',
    view: () => '<h1>Home</h1><p>Hover (or Tab onto) <strong>Quarterly report</strong> before clicking it.</p>',
  },
  routes: {
    report: {
      path: '/report',
      view: lazy(() => import('./report.js')),
    },
  },
};
