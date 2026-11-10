import { href, isCurrent } from '@nav-router/preact';

import { orgs } from '../store.js';

const Tab = ({ route, args, children }) => (
  <a href={href(route, args)} class='tab' aria-current={isCurrent(route, args) ? 'page' : undefined}>
    {children}
  </a>
);

export const TeamLayout = ({ params }) => {
  const { org } = params;
  return (
    <div class='team' data-org={org}>
      <div class='team-head'>
        <h2>
          {orgs[org]?.name ?? org} <small>{orgs[org]?.region ?? ''}</small>
        </h2>
        <nav class='tabs' aria-label='Team'>
          <Tab route='team' args={{ org, tab: 'overview' }}>Overview</Tab>
          <Tab route='team' args={{ org, tab: 'members' }}>Members</Tab>
          <Tab route='team' args={{ org, tab: 'activity' }}>Activity</Tab>
          <Tab route='analytics' args={{ org }}>Analytics</Tab>
          <Tab route='settings' args={{ org }}>Settings</Tab>
          <Tab route='print' args={{ org }}>Print</Tab>
        </nav>
      </div>
      <div class='team-body'>
        <aside id='sidebar-scroll' class='sidebar' tabindex='0'>
          <slot name='sidebar'>
            <p class='muted fallback'>No sidebar on this page.</p>
          </slot>
        </aside>
        <section class='content'>
          <slot></slot>
        </section>
      </div>
    </div>
  );
};
