import { user } from '../store.js';

export const HomePage = (props) => (
  <section class='page'>
    <h1>Overview</h1>
    <p>{props.data.memberCount} members across the company.</p>
    <p>Signed in as {user.value?.name ?? 'nobody'}.</p>
    <a href='/team/acme' class='btn'>Open Team Acme</a>
  </section>
);
