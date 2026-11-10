import { href, isActive, isCurrent, useLive } from '@nav-router/react';

import { signIn, user } from '../store.js';

// a link by route name: href builds it, and isActive or isCurrent reads the router's current page,
// a cell under the scaffold, so read through useLive aria-current follows every navigation. the
// anchor is the app's: every other prop passes through to it and the component adds nothing of its own
const Link = ({ route, args, under, children, ...rest }) => {
  const current = useLive(() => (under ? isActive(route, args) : isCurrent(route, args)));
  return (
    <a href={href(route, args)} aria-current={current ? 'page' : undefined} {...rest}>
      {children}
    </a>
  );
};

export const RootLayout = () => {
  const who = useLive(() => user.get());
  return (
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
          <span className='badge' data-role={who?.role ?? 'none'}>
            {who ? `${who.name} (${who.role})` : 'Signed out'}
          </span>
          <button type='button' onClick={() => signIn(null)}>Out</button>
          <button type='button' onClick={() => signIn('member')}>Member</button>
          <button type='button' onClick={() => signIn('admin')}>Admin</button>
        </div>
      </header>
      <main className='body'>
        <slot></slot>
      </main>
    </div>
  );
};
