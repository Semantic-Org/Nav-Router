import { href } from 'nav-router';

// how many times each page's data has run
const loads = {};

const Layout = () => `
  <header>
    <a href="${href('page', { id: 'one' })}">One</a>
    <a href="${href('page', { id: 'two' })}">Two</a>
    <a href="${href('page', { id: 'three' })}">Three</a>
  </header>
  <slot></slot>`;

export const routes = {
  name: 'home',
  layout: Layout,
  index: {
    path: '/',
    view: () => '<h1>Pages</h1><p>Open a few pages, then go back.</p>',
  },
  routes: {
    page: {
      path: '/pages/:id',
      data: ({ params }) => {
        loads[params.id] = (loads[params.id] ?? 0) + 1;
        return { id: params.id, loads: loads[params.id] };
      },
      view: ({ data }) => `
        <h1>Page ${data.id}</h1>
        <p>Its data has loaded <strong>${data.loads}</strong> time${data.loads === 1 ? '' : 's'}.</p>`,
    },
  },
};
