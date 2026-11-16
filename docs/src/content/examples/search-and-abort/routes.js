import { href } from 'nav-router';

const PEOPLE = ['Ada Park', 'Ari Stone', 'Mo Reyes', 'Sam Ito'];
const log = [];

// a broad one-letter query takes 900ms; a narrower one takes 150ms
const search = (q, signal) =>
  new Promise((resolve, reject) => {
    if (!q) { return resolve(PEOPLE); }
    const ms = q.length === 1 ? 900 : 150;
    const timer = setTimeout(() => {
      log.unshift(`loaded "${q}" (${ms}ms)`);
      const needle = q.toLowerCase();
      resolve(PEOPLE.filter((name) => name.toLowerCase().includes(needle)));
    }, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      log.unshift(`aborted "${q}"`);
      reject(signal.reason);
    }, { once: true });
  });

export const routes = {
  index: { path: '/', redirect: 'people' },
  routes: {
    people: {
      path: '/people',
      query: { q: '' },
      data: async ({ query, signal }) => ({
        matches: await search(query.q, signal),
      }),
      view: ({ query, data }) => {
        const items = data.matches.map((n) => `<li>${n}</li>`).join('');
        const recent = log.slice(0, 4).join(' → ');
        return `
          <form action="${href('people')}">
            <input id="q" name="q" value="${query.q}" placeholder="Search people…">
            <button type="submit">Search</button>
          </form>
          <p class="muted">
            Race test: <a href="${href('people', { q: 'a' })}">"a" (900ms)</a> ·
            <a href="${href('people', { q: 'ada' })}">"ada" (150ms)</a> ·
            <a href="${href('people')}">Reset</a>
          </p>
          <ul>${items || '<li>No matches</li>'}</ul>
          ${recent ? `<p class="muted">${recent}</p>` : ''}`;
      },
    },
  },
};
