import { href } from 'nav-router';

const Layout = () => `
  <header>
    <a href="${href('home')}">Home</a>
    <a href="${href('settings')}">Settings (admins)</a>
    <a href="${href('signIn')}">Sign in</a>
  </header>
  <slot></slot>`;

export const routes = {
  name: 'home',
  layout: Layout,
  signInRoute: 'signIn',
  statusViews: {
    forbidden: ({ user }) =>
      `<h1>Not allowed</h1><p>${user?.name} is signed in as a ${user?.role}. Settings needs an admin.</p>`,
  },
  index: {
    path: '/',
    view: ({ user }) => `
      <h1>Home</h1>
      <p>${user ? `Signed in as ${user.name} (${user.role}).` : 'Signed out.'} Try opening Settings.</p>`,
  },
  routes: {
    signIn: {
      path: '/sign-in',
      view: () => `
        <h1>Sign in</h1>
        <p>
          <button type="button" data-sign-in="member">As a member</button>
          <button type="button" data-sign-in="admin">As an admin</button>
          <button type="button" data-sign-in="none">Sign out</button>
        </p>`,
    },
    settings: {
      path: '/settings',
      permission: ({ user }) => user?.role === 'admin',
      view: ({ user }) => `<h1>Settings</h1><p>Welcome, ${user.name}.</p>`,
    },
  },
};
