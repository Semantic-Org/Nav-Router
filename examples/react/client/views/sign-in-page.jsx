import { navigate } from '@nav-router/react';

import { signIn } from '../store.js';

export const SignInPage = ({ query }) => {
  const enter = (role) => {
    signIn(role);
    navigate(query.returnTo ?? '/');
  };
  return (
    <section className='page'>
      <h1>Sign in</h1>
      <p>{query.returnTo ? `You will go back to ${query.returnTo}.` : 'You will go to the overview.'}</p>
      <button type='button' onClick={() => enter('member')}>Sign in as member</button>
      <button type='button' onClick={() => enter('admin')}>Sign in as admin</button>
    </section>
  );
};
