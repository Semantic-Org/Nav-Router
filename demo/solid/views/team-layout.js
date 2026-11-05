import html from 'solid-js/html';

import { isHere, orgs } from '../store.js';

export const TeamLayout = (props) => {
  const base = () => `/team/${props.params.org}`;
  const tab = (path, label) =>
    html`<a href=${() =>
      base() + path} class="tab" aria-current=${() => (isHere(base() + path) ? 'page' : undefined)}>${label}</a>`;
  return html`
    <div class="team" data-org=${() => props.params.org}>
      <div class="team-head">
        <h2>${() => orgs[props.params.org]?.name ?? props.params.org} <small>${() =>
    orgs[props.params.org]?.region ?? ''}</small></h2>
        <nav class="tabs" aria-label="Team">
          ${tab('', 'Overview')}
          ${tab('/members', 'Members')}
          ${tab('/activity', 'Activity')}
          ${tab('/analytics', 'Analytics')}
          ${tab('/settings', 'Settings')}
          ${tab('/print', 'Print')}
        </nav>
      </div>
      <div class="team-body">
        <aside id="sidebar-scroll" class="sidebar" tabindex="0">
          <slot name="sidebar"><p class="muted fallback">No sidebar on this page.</p></slot>
        </aside>
        <section class="content"><slot></slot></section>
      </div>
    </div>
  `;
};
