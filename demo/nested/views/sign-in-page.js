import { escapeHTML } from '@semantic-ui/utils';

export function SignInPage(context) {
  const { router } = context ?? {};
  const user = router?.user ?? null;

  return `
    <main class="page-container sign-in-page">
      <section class="auth-card">
        <span class="eyebrow">Authentication &amp; Permission Testing</span>
        <h1>Sign In to Acme Console</h1>
        <p class="subtitle">
          Choose an identity below to set <code>app.user</code> and test how <code>permission: ({ user }) =&gt; user?.role === 'admin'</code> behaves on <code>/team/acme/settings</code>.
        </p>

        <div class="current-session-banner">
          <div>
            <span class="session-label">Current <code>app.user</code>:</span>
            <code id="signin-user-json">${escapeHTML(JSON.stringify(user))}</code>
          </div>
          <span class="badge ${user?.role === 'admin' ? 'badge-admin' : (user ? 'badge-member' : 'badge-anon')}">
            ${user ? `Signed in as ${escapeHTML(user.role)}` : 'Unauthenticated'}
          </span>
        </div>

        <div class="role-options">
          <div class="role-card ${user?.role === 'admin' ? 'is-selected' : ''}">
            <div class="role-card-header">
              <strong>Alice Rivera</strong>
              <span class="badge badge-admin">role: 'admin'</span>
            </div>
            <p>Passes <code>permission</code> check on <code>/team/:org/settings</code> and renders <code>SettingsPage</code>.</p>
            <div class="card-links">
              <button type="button" class="btn btn-primary" data-set-user="admin">Sign In as Admin</button>
              <button type="button" class="btn" data-set-user="admin" data-then-nav="/team/acme/settings">Sign In Admin &amp; Go to Settings →</button>
            </div>
          </div>

          <div class="role-card ${user?.role === 'member' ? 'is-selected' : ''}">
            <div class="role-card-header">
              <strong>Bob Chen</strong>
              <span class="badge badge-member">role: 'member'</span>
            </div>
            <p>Authenticated but non-admin. Visiting <code>/team/:org/settings</code> stays at the URL and swaps in <code>ForbiddenPage</code> (<code>status: 'forbidden'</code>).</p>
            <div class="card-links">
              <button type="button" class="btn btn-primary" data-set-user="member">Sign In as Member</button>
              <button type="button" class="btn" data-set-user="member" data-then-nav="/team/acme/settings">Sign In Member &amp; Try Settings →</button>
            </div>
          </div>

          <div class="role-card ${!user ? 'is-selected' : ''}">
            <div class="role-card-header">
              <strong>Anonymous Visitor</strong>
              <span class="badge badge-anon">user: null</span>
            </div>
            <p>Unauthenticated. Visiting <code>/team/:org/settings</code> triggers redirect to <code>signInRoute: 'signIn'</code> (<code>/sign-in</code>).</p>
            <div class="card-links">
              <button type="button" class="btn" data-set-user="none">Sign Out (Clear User)</button>
              <button type="button" class="btn" data-set-user="none" data-then-nav="/team/acme/settings">Sign Out &amp; Try Settings (Redirects Here) →</button>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

export default SignInPage;
