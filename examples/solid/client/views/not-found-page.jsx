export const NotFoundPage = (props) => (
  <section class='page status' data-status='notFound'>
    <h2>Not found</h2>
    <p>Nothing at {new URL(props.page.url, location.origin).pathname}.</p>
  </section>
);
