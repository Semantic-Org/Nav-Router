export const ErrorPage = (props) => (
  <section class='page status' data-status='error'>
    <h2>Something broke</h2>
    <p>{props.page.error?.message ?? 'Navigation failed'}</p>
    <a href='/' class='btn'>Return home</a>
  </section>
);
