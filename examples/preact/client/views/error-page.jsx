export const ErrorPage = ({ page }) => (
  <section class='page status' data-status='error'>
    <h2>Something broke</h2>
    <p>{page.error?.message ?? 'Navigation failed'}</p>
    <a href='/' class='btn'>Return home</a>
  </section>
);
