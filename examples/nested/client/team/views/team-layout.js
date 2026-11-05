import { escapeHTML } from '@semantic-ui/utils';

import { orgs } from '../../data.js';

export function TeamLayout({ params = {} }) {
  const orgKey = params.org || 'acme';
  const orgInfo = orgs[orgKey] ?? {
    id: orgKey,
    name: `${orgKey.toUpperCase()} Workspace`,
    tier: 'Custom Organization',
    region: 'global-edge',
    cluster: `${orgKey}-cluster-01`,
  };

  return `
    <div class="team-shell" data-team-org="${escapeHTML(orgKey)}">
      <div class="team-header">
        <div class="team-header-top">
          <div class="team-title-block">
            <span class="eyebrow">Section Layout · <code>/team/:org</code></span>
            <div class="team-title-row">
              <h2>${escapeHTML(orgInfo.name)} <span class="org-slug">(${escapeHTML(orgKey)})</span></h2>
              <span class="cluster-pill">${escapeHTML(orgInfo.tier)} · ${escapeHTML(orgInfo.cluster)}</span>
            </div>
            <p class="team-region">${escapeHTML(orgInfo.region)}</p>
          </div>

          <div class="org-switcher" role="group" aria-label="Switch Organization Parameter">
            <span class="switcher-label"><code>:org</code> param:</span>
            <a href="/team/acme" class="btn-chip">acme</a>
            <a href="/team/globex" class="btn-chip">globex</a>
          </div>
        </div>

        <nav class="team-tabs" aria-label="Team Section Navigation">
          <a href="/team/${escapeHTML(orgKey)}" class="team-tab">
            Overview <span class="tab-meta">:tab=overview</span>
          </a>
          <a href="/team/${escapeHTML(orgKey)}/members" class="team-tab">
            Members <span class="tab-meta">:tab=members</span>
          </a>
          <a href="/team/${escapeHTML(orgKey)}/activity" class="team-tab">
            Activity <span class="tab-meta">:tab=activity</span>
          </a>
          <a href="/team/${escapeHTML(orgKey)}/analytics" class="team-tab">
            Analytics <span class="tab-meta">1500ms async</span>
          </a>
          <a href="/team/${escapeHTML(orgKey)}/settings" class="team-tab">
            Settings <span class="tab-meta">admin guard</span>
          </a>
        </nav>
      </div>

      <div class="team-body">
        <aside id="sidebar-scroll" class="team-sidebar-container sidebar-scroll-area" tabindex="0" aria-label="Team Sidebar">
          <slot name="sidebar"></slot>
        </aside>
        <section class="team-content" id="team-content">
          <slot></slot>
        </section>
      </div>
    </div>
  `;
}

export default TeamLayout;
