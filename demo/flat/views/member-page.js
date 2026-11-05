import { escapeHTML } from '@semantic-ui/utils';

import { MEMBERS } from '../data.js';

export function MemberPage({ data = {}, params = {}, query = {} } = {}) {
  const org = params.org || 'acme';
  const member = data.member ?? MEMBERS[params.userId] ?? {
    id: params.userId,
    name: 'Unknown Member',
    role: 'N/A',
    access: 'member',
    team: 'Unknown',
    location: 'Unknown',
    bio: '',
    commits: [],
    permissions: [],
  };
  const section = query.section || 'profile';

  return `
    <div class="team-page member-page" data-member-id="${escapeHTML(member.id)}" data-section="${escapeHTML(section)}">
      <div class="member-header-card">
        <div class="member-header-main">
          <span class="eyebrow">Member Route · <code>/team/:org/:userId</code></span>
          <div class="member-title-line">
            <h3>${escapeHTML(member.name)}</h3>
            <span class="muted">${escapeHTML(member.handle ?? `@${member.id}`)}</span>
            <span class="badge ${member.access === 'admin' ? 'badge-admin' : 'badge-member'}">${
    escapeHTML(member.access)
  }</span>
          </div>
          <p class="member-sub">${escapeHTML(member.role)} · ${escapeHTML(member.team)} · ${
    escapeHTML(member.location)
  }</p>
        </div>

        <div class="member-nav-actions">
          <a href="/team/${escapeHTML(org)}/members" class="btn">← All Members</a>
          <a href="/team/${escapeHTML(org)}/unknown-user" class="btn btn-danger">Test 404 Member</a>
        </div>
      </div>

      <div class="section-subtabs" role="tablist" aria-label="Member Section Query Tabs">
        <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}?section=profile" class="subtab ${
    section === 'profile' ? 'is-active' : ''
  }">
          Profile (<code>?section=profile</code>)
        </a>
        <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}?section=commits" class="subtab ${
    section === 'commits' ? 'is-active' : ''
  }">
          Commits (<code>?section=commits</code>)
        </a>
        <a href="/team/${escapeHTML(org)}/${escapeHTML(member.id)}?section=permissions" class="subtab ${
    section === 'permissions' ? 'is-active' : ''
  }">
          Permissions (<code>?section=permissions</code>)
        </a>
        <a href="/team/${escapeHTML(org)}/${
    escapeHTML(member.id)
  }?section=invalid-value" class="subtab" title="Invalid value falls back to default 'profile'">
          Test Invalid Query (<code>?section=invalid-value</code>)
        </a>
      </div>

      <div class="member-section-body">
        ${
    section === 'commits'
      ? `
          <div class="commits-list">
            <h4>Recent Commits by ${escapeHTML(member.name)}</h4>
            ${
        (member.commits ?? []).map((commit) => `
              <div class="commit-row">
                <code class="commit-sha">${escapeHTML(commit.sha)}</code>
                <span class="commit-msg">${escapeHTML(commit.message)}</span>
                <span class="commit-meta">${escapeHTML(commit.branch)} · ${escapeHTML(commit.time)}</span>
              </div>
            `).join('')
      }
          </div>
        `
      : (section === 'permissions'
        ? `
          <div class="permissions-list">
            <h4>Access Matrix for ${escapeHTML(member.name)}</h4>
            ${
          (member.permissions ?? []).map((perm) => `
              <div class="permission-row">
                <div>
                  <code>${escapeHTML(perm.scope)}</code>
                  <p class="muted">${escapeHTML(perm.description)}</p>
                </div>
                <span class="badge ${perm.level === 'No Access' ? 'badge-anon' : 'badge-admin'}">${
            escapeHTML(perm.level)
          }</span>
              </div>
            `).join('')
        }
          </div>
        `
        : `
          <div class="profile-details">
            <h4>Biography &amp; Responsibilities</h4>
            <p>${escapeHTML(member.bio)}</p>
            <div class="profile-meta-grid">
              <div class="meta-item">
                <span class="meta-label">User ID Param</span>
                <code>${escapeHTML(member.id)}</code>
              </div>
              <div class="meta-item">
                <span class="meta-label">Primary Team</span>
                <strong>${escapeHTML(member.team)}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">Location</span>
                <strong>${escapeHTML(member.location)}</strong>
              </div>
              <div class="meta-item">
                <span class="meta-label">Active Section Query</span>
                <code>${escapeHTML(section)}</code>
              </div>
            </div>
          </div>
        `)
  }
      </div>
    </div>
  `;
}

export default MemberPage;
