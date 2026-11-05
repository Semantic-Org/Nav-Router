import { navigate } from 'nav-router';
import html from 'solid-js/html';

import { signIn } from '../store.js';

export const SignInPage = (props) => {
  const enter = (role) => {
    signIn(role);
    navigate(props.query.returnTo ?? '/');
  };
  return html`
    <section class="page">
      <h1>Sign in</h1>
      <p>${() => (props.query.returnTo
    ? `You will go back to ${props.query.returnTo}.`
    : 'You will go to the overview.')}</p>
      <button type="button" onClick=${() => enter('member')}>Sign in as member</button>
      <button type="button" onClick=${() => enter('admin')}>Sign in as admin</button>
    </section>
  `;
};
