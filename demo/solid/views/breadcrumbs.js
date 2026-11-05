import html from 'solid-js/html';

import { page } from '../store.js';

export const Breadcrumbs = () =>
  html`<nav class="crumbs" aria-label="Breadcrumb">${() => (page()?.titles ?? []).join(' / ')}</nav>`;
