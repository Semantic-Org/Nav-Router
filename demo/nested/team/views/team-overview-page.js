import { capitalize, escapeHTML } from '@semantic-ui/utils';

import { MEMBERS } from '../../data.js';

export function TeamOverviewPage(context) {
  const {
    data = {},
    params = {},
    query = {},
  } = context ?? {};

  const org = params.org || 'acme';
  const tab = params.tab || 'overview';
  const compact = Boolean(query.compact);
  const members = data.members ?? Object.values(MEMBERS);
  const nextCompactHref = compact
    ? `/team/${org}/${tab}`
    : `/team/${org}/${tab}?compact=true`;

  return `
    <div class="team-page team-overview-page" data-tab="${escapeHTML(tab)}" data-compact="${String(compact)}">
      <div class="page-toolbar">
        <div>
          <span class="eyebrow">Index Route · <code>/team/:org/:tab</code></span>
          <h3>Team ${escapeHTML(org.toUpperCase())} — ${escapeHTML(capitalize(tab))}</h3>
          <p class="toolbar-note">
            Allowed <code>:tab</code> values: <code>overview</code>, <code>members</code>, <code>activity</code>.
            Query <code>compact</code> coerced to boolean: <code id="compact-query-value">${String(compact)}</code>.
          </p>
        </div>

        <div class="query-controls">
          <a href="${escapeHTML(nextCompactHref)}" class="btn ${compact ? 'btn-primary' : ''}" id="toggle-compact-link">
            ${compact ? 'Disable ?compact=true' : 'Enable ?compact=true'}
          </a>
          <label class="focus-test-control" title="Typing or toggling updates ?compact without losing input focus or resetting scroll">
            <span>Focus-safe query toggle:</span>
            <input
              type="text"
              id="query-focus-input"
              data-preserve-focus="true"
              placeholder="Type here &amp; toggle ?compact…"
              class="input-compact"
            />
            <button type="button" class="btn-chip" data-toggle-compact="true">
              Toggle ?compact (${String(compact)})
            </button>
          </label>
        </div>
      </div>

      ${
    tab === 'overview'
      ? `
        <div class="kpi-strip">
          <div class="kpi-box">
            <span class="kpi-label">Organization</span>
            <strong class="kpi-val">${escapeHTML(org.toUpperCase())}</strong>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Roster Size</span>
            <strong class="kpi-val">${escapeHTML(String(members.length))} members</strong>
          </div>
          <div class="kpi-box">
            <span class="kpi-label">Layout Mode</span>
            <strong class="kpi-val">${compact ? 'Compact Rows' : 'Detailed Cards'}</strong>
          </div>
        </div>
      `
      : ''
  }

      ${
    tab === 'activity'
      ? `
        <div class="activity-feed ${compact ? 'is-compact' : ''}">
          ${
        members.map((member) => `
            <div class="activity-row">
              <div class="activity-meta">
                <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}" class="member-link">
                  <strong>${escapeHTML(member.name)}</strong>
                </a>
                <span class="badge ${member.access === 'admin' ? 'badge-admin' : 'badge-member'}">${
          escapeHTML(member.access)
        }</span>
                <span class="muted">${escapeHTML(member.team)}</span>
              </div>
              <p class="activity-text">${escapeHTML(member.activity)}</p>
            </div>
          `).join('')
      }
        </div>
      `
      : `
        <div class="members-collection ${compact ? 'members-compact-table' : 'members-card-grid'}">
          ${
        members.map((member) => (compact
          ? `
            <div class="member-compact-row">
              <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}" class="member-link">
                <strong>${escapeHTML(member.name)}</strong>
                <span class="muted">${escapeHTML(member.handle)}</span>
              </a>
              <span class="muted">${escapeHTML(member.role)}</span>
              <span class="badge ${member.access === 'admin' ? 'badge-admin' : 'badge-member'}">${
            escapeHTML(member.access)
          }</span>
              <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}?section=commits" class="btn-tiny">Commits →</a>
            </div>
          `
          : `
            <article class="member-card">
              <div class="member-card-top">
                <div>
                  <h4>
                    <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}" class="member-link">${
            escapeHTML(member.name)
          }</a>
                  </h4>
                  <span class="member-role">${escapeHTML(member.role)} · ${escapeHTML(member.team)}</span>
                </div>
                <span class="badge ${member.access === 'admin' ? 'badge-admin' : 'badge-member'}">${
            escapeHTML(member.access)
          }</span>
              </div>
              <p class="member-bio">${escapeHTML(member.bio)}</p>
              <div class="member-card-footer">
                <span class="muted">${escapeHTML(member.location)}</span>
                <div class="card-links">
                  <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}" class="btn-tiny">Profile</a>
                  <a href="/team/${escapeHTML(org)}/${
            escapeHTML(member.id)
          }?section=commits" class="btn-tiny">Commits</a>
                  <a href="/team/${escapeHTML(org)}/${
            escapeHTML(member.id)
          }?section=permissions" class="btn-tiny">Permissions</a>
                </div>
              </div>
            </article>
          `)
        ).join('')
      }
        </div>
      `
  }
    </div>
  `;
}

export default TeamOverviewPage;
