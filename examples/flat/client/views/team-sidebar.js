import { escapeHTML } from '@semantic-ui/utils';

import { MEMBERS, sidebarShortcuts } from '../data.js';

export function TeamSidebar({ params = {} }) {
  const org = params.org || 'acme';
  const members = Object.values(MEMBERS);

  return `
    <div class="sidebar-card">
      <div class="sidebar-top-bar">
        <div>
          <span class="sidebar-heading">Slot: <code>sidebar</code></span>
          <span class="sidebar-sub"><code>restoreScroll: '#sidebar-scroll'</code></span>
        </div>
        <div class="scroll-controls">
          <span class="scroll-badge" id="sidebar-scroll-readout">scrollTop: 0px</span>
          <button type="button" class="btn-tiny" data-scroll-sidebar="180" title="Scroll #sidebar-scroll to 180px to test scroll restoration">
            Scroll 180px
          </button>
        </div>
      </div>

      <div class="sidebar-group-label">Team Members (<code>/team/:org/:userId</code>)</div>
      <ul class="sidebar-list">
        ${
    members.map((member) => `
          <li>
            <a href="${escapeHTML(`/team/${org}/${member.id}`)}" class="sidebar-item">
              <div class="sidebar-item-main">
                <span class="status-dot status-${escapeHTML(member.status)}"></span>
                <span class="sidebar-item-name">${escapeHTML(member.name)}</span>
              </div>
              <span class="sidebar-item-meta">${escapeHTML(member.access)}</span>
            </a>
          </li>
        `).join('')
  }
        <li>
          <a href="/team/${escapeHTML(org)}/unknown-user" class="sidebar-item sidebar-item-danger">
            <div class="sidebar-item-main">
              <span class="status-dot status-danger"></span>
              <span class="sidebar-item-name">unknown-user</span>
            </div>
            <span class="sidebar-item-meta">notFound()</span>
          </a>
        </li>
      </ul>

      <div class="sidebar-group-label">Deep-Link Shortcuts (Scrollable Area)</div>
      <ul class="sidebar-list">
        ${
    sidebarShortcuts.map((item) => `
          <li>
            <a href="${escapeHTML(item.path(org))}" class="sidebar-item">
              <div class="sidebar-item-main">
                <span class="sidebar-item-name">${escapeHTML(item.label)}</span>
              </div>
              <span class="sidebar-item-meta">${escapeHTML(item.sub)}</span>
            </a>
          </li>
        `).join('')
  }
      </ul>
    </div>
  `;
}

export default TeamSidebar;
