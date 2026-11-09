import { href, isActive, isCurrent } from 'nav-router';
import { splitProps } from 'solid-js';

import { signIn, user } from '../store.js';

// a link by route name: href builds it, and isActive or isCurrent reads the router's current page,
// a cell under the scaffold, so aria-current follows every navigation with nothing wired. the
// anchor is the app's: every other prop passes through to it and the component adds nothing of its own
const Link = (props) => {
  const [own, rest] = splitProps(props, ['route', 'args', 'under', 'children']);
  const current = () => (own.under ? isActive(own.route, own.args) : isCurrent(own.route, own.args));
  return (
    <a href={href(own.route, own.args)} aria-current={current() ? 'page' : undefined} {...rest}>
      {own.children}
    </a>
  );
};

export const RootLayout = () => (
  <div class='shell'>
    <header class='top'>
      <a href='/' class='brand'>Acme Console</a>
      <slot name='breadcrumbs'></slot>
      <nav class='links' aria-label='Primary'>
        <Link route='home'>Overview</Link>
        <Link route='team' args={{ org: 'acme' }} under>Acme</Link>
        <Link route='team' args={{ org: 'globex' }} under>Globex</Link>
        <Link route='analytics' args={{ org: 'acme' }}>Analytics</Link>
        <Link route='settings' args={{ org: 'acme' }}>Settings</Link>
        <Link route='legacyDocs'>Old docs</Link>
      </nav>
      <div class='who'>
        <span class='badge' data-role={user()?.role ?? 'none'}>
          {user() ? `${user().name} (${user().role})` : 'Signed out'}
        </span>
        <button type='button' onClick={() => signIn(null)}>Out</button>
        <button type='button' onClick={() => signIn('member')}>Member</button>
        <button type='button' onClick={() => signIn('admin')}>Admin</button>
      </div>
    </header>
    <main class='body'>
      <slot></slot>
    </main>
  </div>
);
