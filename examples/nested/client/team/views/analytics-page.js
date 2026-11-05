import { escapeHTML } from '@semantic-ui/utils';

export function AnalyticsPage({ data = {}, params = {} } = {}) {
  const org = data.org ?? params.org ?? 'acme';

  return `
    <div class="team-page analytics-page" data-analytics-org="${escapeHTML(org)}">
      <div class="page-toolbar">
        <div>
          <span class="eyebrow">Async Data Slices + Lazy View · <code>/team/:org/analytics</code></span>
          <h3>Real-Time Telemetry (${escapeHTML(org.toUpperCase())})</h3>
          <p class="toolbar-note">
            Resolved parallel promises: <code>latency</code> (400ms), <code>uptime</code> (900ms), and <code>throughput</code> (1500ms) with <code>holdCommit: '300ms'</code>, <code>loadingDelay: '200ms'</code>, <code>loadingMin: '500ms'</code>.
          </p>
        </div>
        <div class="card-links">
          <button type="button" class="btn btn-primary" data-router-action="reload">
            Re-run Cascade (<code>app.reload()</code>)
          </button>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label">Edge p95 Latency (<code>wait(400)</code>)</span>
          <strong class="metric-value" id="metric-latency">${escapeHTML(data.latency ?? '—')}</strong>
          <span class="metric-sub">Resolved within 400ms slice</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Global SLA Uptime (<code>wait(900)</code>)</span>
          <strong class="metric-value" id="metric-uptime">${escapeHTML(data.uptime ?? '—')}</strong>
          <span class="metric-sub">Resolved within 900ms slice</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Peak Throughput (<code>wait(1500)</code>)</span>
          <strong class="metric-value" id="metric-throughput">${escapeHTML(data.throughput ?? '—')}</strong>
          <span class="metric-sub">Resolved within 1500ms slice</span>
        </div>
      </div>
    </div>
  `;
}

export default AnalyticsPage;
