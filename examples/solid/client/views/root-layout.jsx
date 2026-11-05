import { href, isActive, isCurrent } from 'nav-router';

import { signIn, user } from '../store.js';

// a link by route name: href builds it, and isActive or isCurrent reads the router's current page,
// a cell under the scaffold, so aria-current follows every navigation with nothing wired
const Link = (props) => {
  const current = () => (props.under ? isActive(props.route, props.args) : isCurrent(props.route, props.args));
  return (
    <a href={href(props.route, props.args)} class='nav-link' aria-current={current() ? 'page' : undefined}>
      {props.children}
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
