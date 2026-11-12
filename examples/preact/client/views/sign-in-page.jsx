import { signIn } from '../store.js';

export const SignInPage = ({ query }) => (
  <section class='page'>
    <h1>Sign in</h1>
    <p>{query.returnTo ? `You will go back to ${query.returnTo}.` : 'You will go to the overview.'}</p>
    <button type='button' onClick={() => signIn('member', query.returnTo ?? '/')}>Sign in as member</button>
    <button type='button' onClick={() => signIn('admin', query.returnTo ?? '/')}>Sign in as admin</button>
  </section>
);
