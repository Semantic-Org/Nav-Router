export const HomePage = ({ data, user }) => (
  <section className='page'>
    <h1>Overview</h1>
    <p>{data.memberCount} members across the company.</p>
    <p>Signed in as {user?.name ?? 'nobody'}.</p>
    <a href='/team/acme' className='btn'>Open Team Acme</a>
  </section>
);
