import html from 'solid-js/html';

import { isHere, signIn, user } from '../store.js';

const link = (href, label, { under = false } = {}) =>
  html`<a href=${href} class="nav-link" aria-current=${() => (isHere(href, { under })
    ? 'page'
    : undefined)}>${label}</a>`;

export const RootLayout = () =>
  html`
  <div class="shell">
    <header class="top">
      <a href="/" class="brand">Acme Console</a>
      <slot name="breadcrumbs"></slot>
      <nav class="links" aria-label="Primary">
        ${link('/', 'Overview')}
        ${link('/team/acme', 'Acme', { under: true })}
        ${link('/team/globex', 'Globex', { under: true })}
        ${link('/team/acme/analytics', 'Analytics')}
        ${link('/team/acme/settings', 'Settings')}
        ${link('/old-docs', 'Old docs')}
      </nav>
      <div class="who">
        <span class="badge" data-role=${() =>
    user()?.role ?? 'none'}>${() => (user() ? `${user().name} (${user().role})` : 'Signed out')}</span>
        <button type="button" onClick=${() => signIn(null)}>Out</button>
        <button type="button" onClick=${() => signIn('member')}>Member</button>
        <button type="button" onClick=${() => signIn('admin')}>Admin</button>
      </div>
    </header>
    <main class="body"><slot></slot></main>
  </div>
`;
