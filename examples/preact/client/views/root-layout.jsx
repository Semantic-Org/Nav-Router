import { href, isActive, isCurrent } from '@nav-router/preact';

import { signIn, user } from '../store.js';

// a link by route name: href builds it, and isActive or isCurrent reads the router's current page,
// a cell under the scaffold, so aria-current follows every navigation with nothing wired. the
// anchor is the app's: every other prop passes through to it and the component adds nothing of its own
const Link = ({ route, args, under, ...rest }) => {
  const current = under ? isActive(route, args) : isCurrent(route, args);
  return <a href={href(route, args)} aria-current={current ? 'page' : undefined} {...rest} />;
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
        <span class='badge' data-role={user.value?.role ?? 'none'}>
          {user.value ? `${user.value.name} (${user.value.role})` : 'Signed out'}
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
