import { href, isActive, isCurrent, reload, useRouter } from '@nav-router/react';

import { signIn } from '../store.js';

// a link by route name: href builds it, and isActive or isCurrent is read through useRouter, so
// aria-current follows every navigation while the layout around it stands untold. the anchor is
// the app's: every other prop passes through to it
const Link = ({ route, args, under, ...rest }) => {
  const current = useRouter(() => (under ? isActive(route, args) : isCurrent(route, args)));
  return <a href={href(route, args)} aria-current={current ? 'page' : undefined} {...rest} />;
};

// the user is read by the guards and the data, so a change is a reload of the page
const enter = (role) => {
  signIn(role);
  reload();
};

export const RootLayout = ({ user }) => (
  <div className='shell'>
    <header className='top'>
      <a href='/' className='brand'>Acme Console</a>
      <slot name='breadcrumbs'></slot>
      <nav className='links' aria-label='Primary'>
        <Link route='home'>Overview</Link>
        <Link route='team' args={{ org: 'acme' }} under>Acme</Link>
        <Link route='team' args={{ org: 'globex' }} under>Globex</Link>
        <Link route='analytics' args={{ org: 'acme' }}>Analytics</Link>
        <Link route='settings' args={{ org: 'acme' }}>Settings</Link>
        <Link route='legacyDocs'>Old docs</Link>
      </nav>
      <div className='who'>
        <span className='badge' data-role={user?.role ?? 'none'}>
          {user ? `${user.name} (${user.role})` : 'Signed out'}
        </span>
        <button type='button' onClick={() => enter(null)}>Out</button>
        <button type='button' onClick={() => enter('member')}>Member</button>
        <button type='button' onClick={() => enter('admin')}>Admin</button>
      </div>
    </header>
    <main className='body'>
      <slot></slot>
    </main>
  </div>
);
