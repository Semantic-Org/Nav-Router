export const ErrorPage = ({ page }) => (
  <section className='page status' data-status='error'>
    <h2>Something broke</h2>
    <p>{page.error?.message ?? 'Navigation failed'}</p>
    <a href='/' className='btn'>Return home</a>
  </section>
);
