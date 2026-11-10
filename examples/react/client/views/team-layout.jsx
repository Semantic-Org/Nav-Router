import { href, isCurrent } from '@nav-router/react';

import { orgs } from '../store.js';

// the layout renders again with every page, so a tab reads the current page as it renders
const Tab = ({ route, args, children }) => (
  <a href={href(route, args)} className='tab' aria-current={isCurrent(route, args) ? 'page' : undefined}>
    {children}
  </a>
);

export const TeamLayout = ({ params: { org } }) => (
  <div className='team' data-org={org}>
    <div className='team-head'>
      <h2>
        {orgs[org]?.name ?? org} <small>{orgs[org]?.region ?? ''}</small>
      </h2>
      <nav className='tabs' aria-label='Team'>
        <Tab route='team' args={{ org, tab: 'overview' }}>Overview</Tab>
        <Tab route='team' args={{ org, tab: 'members' }}>Members</Tab>
        <Tab route='team' args={{ org, tab: 'activity' }}>Activity</Tab>
        <Tab route='analytics' args={{ org }}>Analytics</Tab>
        <Tab route='settings' args={{ org }}>Settings</Tab>
        <Tab route='print' args={{ org }}>Print</Tab>
      </nav>
    </div>
    <div className='team-body'>
      <aside id='sidebar-scroll' className='sidebar' tabIndex='0'>
        <slot name='sidebar'>
          <p className='muted fallback'>No sidebar on this page.</p>
        </slot>
      </aside>
      <section className='content'>
        <slot></slot>
      </section>
    </div>
  </div>
);
