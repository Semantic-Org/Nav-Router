import { escapeHTML } from '@semantic-ui/utils';

export function LoadingPage(context) {
  const { state = {}, params = {} } = context ?? {};

  return `
    <div class="status-page status-loading" data-status-view="LoadingPage">
      <div class="spinner" aria-hidden="true"></div>
      <div class="status-code-pill status-loading-pill">status: 'loading'</div>
      <h2>Loading ${escapeHTML(state.route?.name ?? 'Route')} Cascade…</h2>
      <p>
        Resolving parallel async data slices for <code>${escapeHTML(state.pathname ?? '')}</code>
        (<code>org: ${escapeHTML(params.org ?? 'acme')}</code>).
      </p>
      <div class="timing-pipeline">
        <span class="timing-step">1. holdCommit: <code>300ms</code></span>
        <span class="timing-sep">→</span>
        <span class="timing-step is-current">2. loadingDelay: <code>200ms</code></span>
        <span class="timing-sep">→</span>
        <span class="timing-step is-current">3. loadingMin: <code>500ms</code></span>
      </div>
    </div>
  `;
}

export default LoadingPage;
