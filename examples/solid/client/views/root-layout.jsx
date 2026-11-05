import { isHere, signIn, user } from '../store.js';

const Link = (props) => (
  <a href={props.href} class='nav-link' aria-current={isHere(props.href, { under: props.under }) ? 'page' : undefined}>
    {props.children}
  </a>
);

export const RootLayout = () => (
  <div class='shell'>
    <header class='top'>
      <a href='/' class='brand'>Acme Console</a>
      <slot name='breadcrumbs'></slot>
      <nav class='links' aria-label='Primary'>
        <Link href='/'>Overview</Link>
        <Link href='/team/acme' under>Acme</Link>
        <Link href='/team/globex' under>Globex</Link>
        <Link href='/team/acme/analytics'>Analytics</Link>
        <Link href='/team/acme/settings'>Settings</Link>
        <Link href='/old-docs'>Old docs</Link>
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
