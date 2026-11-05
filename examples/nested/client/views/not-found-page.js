import { escapeHTML } from '@semantic-ui/utils';

export function NotFoundPage({ page = {}, params = {} } = {}) {
  const pathname = page.url ? new URL(page.url).pathname : '/';
  const org = params.org || 'acme';

  return `
    <div class="status-page status-not-found" data-status-view="NotFoundPage">
      <div class="status-code-pill status-404">404 · status: 'notFound'</div>
      <h2>Resource Not Found</h2>
      <p>
        The route matched <code>${escapeHTML(page.route?.path ?? pathname)}</code> with params
        <code>${escapeHTML(JSON.stringify(params))}</code>, and its <code>data()</code> loader invoked
        <code>notFound()</code>.
      </p>
      <p class="status-note">
        Notice that <code>RootLayout</code> and <code>TeamLayout</code> (including <code>#sidebar-scroll</code>) remain mounted around <code>NotFoundPage</code>!
      </p>
      <div class="card-links">
        <a href="/team/${escapeHTML(org)}/alice" class="btn btn-primary">View Alice Rivera</a>
        <a href="/team/${escapeHTML(org)}" class="btn">Back to Team ${escapeHTML(org.toUpperCase())}</a>
        <a href="/" class="btn">Home Overview</a>
      </div>
    </div>
  `;
}

export default NotFoundPage;
