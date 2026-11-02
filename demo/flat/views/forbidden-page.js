import { escapeHTML } from '@semantic-ui/utils';

export function ForbiddenPage(context) {
  const { state = {}, params = {}, router } = context ?? {};
  const user = router?.user ?? null;
  const org = params.org || 'acme';

  return `
    <div class="status-page status-forbidden" data-status-view="ForbiddenPage">
      <div class="status-code-pill status-403">403 · status: 'forbidden'</div>
      <h2>Access Restricted — Admin Role Required</h2>
      <p>
        Route <code>${escapeHTML(state.route?.path ?? '/team/:org/settings')}</code> rejected access because
        <code>permission: ({ user }) =&gt; user?.role === 'admin'</code> returned <code>false</code> for
        current user <code>${escapeHTML(JSON.stringify(user))}</code>.
      </p>
      <div class="card-links">
        <button type="button" class="btn btn-primary" data-set-user="admin" data-then-reload="true">
          Switch to Admin &amp; app.reload()
        </button>
        <a href="/sign-in" class="btn">Go to /sign-in</a>
        <a href="/team/${escapeHTML(org)}" class="btn">Back to Team Overview</a>
      </div>
    </div>
  `;
}

export default ForbiddenPage;
