import { href } from 'nav-router';

const GUIDES = {
  routing: { title: 'Routing', summary: 'Match paths, coerce params, and build links by name.' },
  plugins: { title: 'Plugins', summary: 'Extend the router by wrapping a single lifecycle method.' },
};

const Layout = () => `
  <header>
    <a href="${href('home')}">Home</a>
    <a href="${href('guide', { slug: 'routing' })}">Routing</a>
    <a href="${href('guide', { slug: 'plugins' })}">Plugins</a>
  </header>
  <slot></slot>
  <pre id="head-out"></pre>`;

export const routes = {
  name: 'home',
  layout: Layout,
  title: 'Acme Docs',
  formatTitle: (_, titles) => titles.join(' · '),
  meta: {
    description: 'Documentation for Acme.',
    'og:site_name': 'Acme',
  },
  index: {
    path: '/',
    view: () =>
      '<h1>Acme Docs</h1><p>Open a guide to see <code>document.title</code> and <code>&lt;head&gt;</code> cascade.</p>',
  },
  routes: {
    guide: {
      path: '/guides/:slug',
      data: ({ params }) => ({ slug: params.slug, ...GUIDES[params.slug] }),
      title: ({ data }) => data.title,
      meta: ({ data }) => ({
        description: data.summary,
        canonical: `https://acme.example/guides/${data.slug}`,
      }),
      view: ({ data }) => `<h1>${data.title}</h1><p>${data.summary}</p>`,
    },
  },
};
