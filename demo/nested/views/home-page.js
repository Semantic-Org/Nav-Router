import { escapeHTML } from '@semantic-ui/utils';

import { MEMBERS } from '../data.js';

export function HomePage(context) {
  const { data = {}, router } = context ?? {};
  const memberCount = data.memberCount ?? Object.keys(MEMBERS).length;
  const user = router?.user ?? null;

  return `
    <main class="page-container home-page">
      <section class="hero-card">
        <div class="hero-header">
          <div>
            <span class="eyebrow">Navigation API Router · Live Workbench</span>
            <h1>Acme Console Overview</h1>
            <p class="subtitle">
              Every link, guard, redirect, query coercion, async data slice, and scroll restoration on this page is driven natively by <code>nav-router</code> on the web platform Navigation API.
            </p>
          </div>
          <div class="stat-box">
            <span class="stat-value" id="home-member-count">${escapeHTML(String(memberCount))}</span>
            <span class="stat-label">Active Members (<code>data.memberCount</code>)</span>
          </div>
        </div>

        <div class="scenario-grid">
          <article class="scenario-card">
            <div class="scenario-tag">Section + Slots + Coercion</div>
            <h3>Team Section &amp; Allowed Tabs</h3>
            <p>Nested <code>TeamLayout</code> + <code>TeamSidebar</code> slot, optional default <code>:tab</code> param (<code>overview</code>, <code>members</code>, <code>activity</code>), and boolean <code>?compact</code> query coercion.</p>
            <div class="card-links">
              <a href="/team/acme" class="btn btn-primary">/team/acme</a>
              <a href="/team/acme/members" class="btn">/team/acme/members</a>
              <a href="/team/acme/members?compact=true" class="btn">?compact=true</a>
              <a href="/team/acme/activity" class="btn">/team/acme/activity</a>
            </div>
          </article>

          <article class="scenario-card">
            <div class="scenario-tag">Dynamic Params + notFound()</div>
            <h3>Member Profiles &amp; 404 Boundary</h3>
            <p>Matches <code>/team/:org/:userId</code> when segment isn't a reserved tab. Valid members load profile slices; unknown IDs call <code>notFound()</code> to render <code>NotFoundPage</code> inside <code>TeamLayout</code>.</p>
            <div class="card-links">
              <a href="/team/acme/alice" class="btn btn-primary">Alice (Admin)</a>
              <a href="/team/acme/bob?section=commits" class="btn">Bob · Commits</a>
              <a href="/team/acme/charlie?section=permissions" class="btn">Charlie · Permissions</a>
              <a href="/team/acme/unknown-user" class="btn btn-danger">/team/acme/unknown-user (404)</a>
            </div>
          </article>

          <article class="scenario-card">
            <div class="scenario-tag">Async Cascade + Timing + entryCache</div>
            <h3>Analytics (Hold, Delay &amp; Min Loading)</h3>
            <p>Resolves 3 parallel promises (400ms, 900ms, 1500ms) and warms lazy <code>analytics-page.js</code> on link intent. Traversing back reads instantaneously from <code>entryCache</code>.</p>
            <div class="card-links">
              <a href="/team/acme/analytics" class="btn btn-primary">Acme Analytics</a>
              <a href="/team/globex/analytics" class="btn">Globex Analytics</a>
            </div>
          </article>

          <article class="scenario-card">
            <div class="scenario-tag">Permission Guard + Redirect</div>
            <h3>Settings Guard &amp; Legacy Redirect</h3>
            <p>
              <code>/team/:org/settings</code> requires <code>user?.role === 'admin'</code>.
              Currently: <strong>${user ? `${escapeHTML(user.name)} (${escapeHTML(user.role)})` : 'Signed Out'}</strong>
              (${
    !user
      ? 'will redirect to /sign-in'
      : (user.role === 'admin' ? 'will render SettingsPage' : 'will render ForbiddenPage')
  }).
            </p>
            <div class="card-links">
              <a href="/team/acme/settings" class="btn btn-primary">Try /team/acme/settings</a>
              <a href="/sign-in" class="btn">Configure Auth (/sign-in)</a>
              <a href="/old-docs" class="btn">Test /old-docs Redirect</a>
            </div>
          </article>
        </div>
      </section>
    </main>
  `;
}

export default HomePage;
