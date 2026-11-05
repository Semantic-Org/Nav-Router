import { href } from 'nav-router';

const TASKS = [
  { title: 'Write the routes', status: 'done' },
  { title: 'Add a guard', status: 'open' },
  { title: 'Ship it', status: 'open' },
];

export const routes = {
  name: 'home',
  index: {
    path: '/',
    query: {
      status: { default: 'open', allowed: ['open', 'done', 'all'] },
      compact: false,
    },
    view: ({ query }) => {
      const shown = TASKS.filter((t) => query.status === 'all' || t.status === query.status);
      return `
        <header>
          <a href="${href('home', { status: 'open' })}">Open</a>
          <a href="${href('home', { status: 'done' })}">Done</a>
          <a href="${href('home', { status: 'all' })}">All</a>
          <button type="button" data-toggle-compact>${query.compact ? 'Show details' : 'Compact'}</button>
        </header>
        <h1>${query.status} tasks</h1>
        <ul>${
        shown.map((t) => `<li>${t.title}${query.compact ? '' : ` <span class="muted">${t.status}</span>`}</li>`).join(
          '',
        )
      }</ul>
        <p class="muted">query is ${JSON.stringify(query)}</p>`;
    },
  },
};
