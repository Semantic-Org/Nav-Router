import { escapeHTML } from '@semantic-ui/utils';

export function RootLayout(context) {
  const {
    outlet = '',
    state = {},
    router,
  } = context ?? {};

  const pathname = state.pathname ?? '/';
  const user = router?.user ?? null;
  const userLabel = user
    ? `${user.name} (${user.role})`
    : 'Signed Out';
  const userBadgeClass = user?.role === 'admin'
    ? 'badge-admin'
    : (user ? 'badge-member' : 'badge-anon');

  const isActive = (prefix, exact = false) => {
    if (exact) {
      return pathname === prefix ? 'is-active' : '';
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`) ? 'is-active' : '';
  };

  return `
    <div class="app-shell">
      <header class="top-nav">
        <div class="brand-group">
          <a href="/" class="brand-link">
            <span class="brand-dot"></span>
            <span class="brand-name">Acme Console</span>
          </a>
          ${
    state.titles?.length
      ? `
            <nav class="breadcrumbs" aria-label="Breadcrumb">
              ${
        state.titles.map((title, index) => `
                <span class="crumb ${index === state.titles.length - 1 ? 'crumb-current' : ''}">${
          escapeHTML(title)
        }</span>
              `).join('<span class="crumb-sep">/</span>')
      }
            </nav>
          `
      : ''
  }
        </div>

        <nav class="primary-links" aria-label="Primary Navigation">
          <a href="/" class="nav-link ${isActive('/', true)}">Overview</a>
          <a href="/team/acme" class="nav-link ${isActive('/team/acme')}">Team Acme</a>
          <a href="/team/globex" class="nav-link ${isActive('/team/globex')}">Team Globex</a>
          <a href="/team/acme/analytics" class="nav-link ${
    pathname.endsWith('/analytics') ? 'is-active' : ''
  }">Analytics</a>
          <a href="/team/acme/settings" class="nav-link ${
    pathname.endsWith('/settings') ? 'is-active' : ''
  }">Settings</a>
          <a href="/old-docs" class="nav-link" title="Redirects to 'home' (/)">/old-docs ↪</a>
          <a href="/sign-in" class="nav-link ${isActive('/sign-in', true)}">Sign In</a>
        </nav>

        <div class="auth-bar">
          <span class="badge ${userBadgeClass}" id="current-user-badge">${escapeHTML(userLabel)}</span>
          <div class="auth-quick-actions" role="group" aria-label="Quick Auth Role Switcher">
            <button type="button" class="btn-chip ${
    !user ? 'is-selected' : ''
  }" data-set-user="none" title="Set app.user = null">Out</button>
            <button type="button" class="btn-chip ${
    user?.role === 'member' ? 'is-selected' : ''
  }" data-set-user="member" title="Set app.user = { role: 'member' }">Member</button>
            <button type="button" class="btn-chip ${
    user?.role === 'admin' ? 'is-selected' : ''
  }" data-set-user="admin" title="Set app.user = { role: 'admin' }">Admin</button>
          </div>
        </div>
      </header>

      <div class="root-body" id="root-outlet">
        ${outlet}
      </div>
    </div>
  `;
}

export default RootLayout;
