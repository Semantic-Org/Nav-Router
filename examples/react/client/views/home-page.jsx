import { useLive } from '@nav-router/react';

import { user } from '../store.js';

export const HomePage = ({ data }) => {
  const name = useLive(() => user.get()?.name);
  return (
    <section className='page'>
      <h1>Overview</h1>
      <p>{data.memberCount} members across the company.</p>
      <p>Signed in as {name ?? 'nobody'}.</p>
      <a href='/team/acme' className='btn'>Open Team Acme</a>
    </section>
  );
};
