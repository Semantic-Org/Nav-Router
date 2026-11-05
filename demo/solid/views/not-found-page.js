import html from 'solid-js/html';

export const NotFoundPage = (props) =>
  html`
  <section class="page status" data-status="notFound">
    <h2>Not found</h2>
    <p>${() => `Nothing at ${new URL(props.page.url, location.origin).pathname}.`}</p>
  </section>
`;
