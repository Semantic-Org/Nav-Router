export const NotFoundPage = ({ page }) => (
  <section className='page status' data-status='notFound'>
    <h2>Not found</h2>
    <p>Nothing at {new URL(page.url, location.origin).pathname}.</p>
  </section>
);
