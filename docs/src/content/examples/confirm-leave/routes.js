import { href } from 'nav-router';

export const note = {
  saved: 'Ship the release notes on Friday.',
  draft: 'Ship the release notes on Friday.',
};

const Layout = () => `
  <header>
    <a href="${href('home')}">Note</a>
    <a href="${href('edit')}">Edit</a>
  </header>
  <slot></slot>`;

export const routes = {
  name: 'home',
  layout: Layout,
  index: {
    path: '/',
    view: () => `<h1>Note</h1><p>${note.saved}</p>`,
  },
  routes: {
    edit: {
      path: '/edit',
      canLeave: () => (note.draft !== note.saved ? 'Discard your unsaved changes?' : true),
      onDestroyed: () => {
        note.draft = note.saved;
      },
      view: () => `
        <h1>Edit note</h1>
        <textarea id="draft" rows="3">${note.draft}</textarea>
        <p><button type="button" data-save>Save</button> <span id="dirty" class="muted">Saved</span></p>`,
    },
  },
};
