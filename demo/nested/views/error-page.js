import { escapeHTML } from '@semantic-ui/utils';

export function ErrorPage({ page }) {
  const message = page.error?.message ?? String(page.error ?? 'Navigation failed');
  return `
    <div class="status-page status-error" data-status-view="ErrorPage">
      <div class="status-code-pill status-403">status: 'error'</div>
      <h2>Navigation Error</h2>
      <p><code>${escapeHTML(message)}</code></p>
      <div class="card-links">
        <a href="/" class="btn btn-primary">Return Home</a>
      </div>
    </div>
  `;
}

export default ErrorPage;
