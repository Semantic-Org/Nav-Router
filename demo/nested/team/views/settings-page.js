import { escapeHTML } from '@semantic-ui/utils';

export function SettingsPage({ params = {}, router } = {}) {
  const org = params.org || 'acme';
  const user = router?.user ?? null;

  return `
    <div class="team-page settings-page" data-settings-org="${escapeHTML(org)}">
      <div class="page-toolbar">
        <div>
          <span class="eyebrow">Protected Route · <code>permission: ({ user }) =&gt; user?.role === 'admin'</code></span>
          <h3>Organization Settings — ${escapeHTML(org.toUpperCase())}</h3>
          <p class="toolbar-note">
            Access granted because <code>app.user.role === 'admin'</code> (${escapeHTML(user?.name ?? 'Admin')}).
          </p>
        </div>
      </div>

      <div class="settings-panels">
        <div class="settings-panel">
          <h4>Permission Guard Live Test</h4>
          <p>
            Demote or clear <code>app.user</code> right from this protected route and run <code>app.reload()</code> to watch the permission cascade react:
          </p>
          <div class="card-links">
            <button type="button" class="btn" data-set-user="member" data-then-reload="true">
              Switch to Member &amp; Reload (→ ForbiddenPage)
            </button>
            <button type="button" class="btn btn-danger" data-set-user="none" data-then-reload="true">
              Sign Out &amp; Reload (→ Redirects to /sign-in)
            </button>
          </div>
        </div>

        <div class="settings-panel">
          <h4>Workspace Configuration</h4>
          <div class="profile-meta-grid">
            <div class="meta-item">
              <span class="meta-label">Organization Slug</span>
              <code>${escapeHTML(org)}</code>
            </div>
            <div class="meta-item">
              <span class="meta-label">Authorized Admin</span>
              <strong>${escapeHTML(user?.name ?? 'Alice Rivera')}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">SSO Enforcement</span>
              <strong>SAML 2.0 + Passkeys Required</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Audit Log Retention</span>
              <strong>365 Days (Immutable)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export default SettingsPage;
