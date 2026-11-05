import { href, isCurrent } from 'nav-router';

import { orgs } from '../store.js';

export const TeamLayout = (props) => {
  const Tab = (tab) => {
    const args = () => ({ org: props.params.org, ...tab.args });
    return (
      <a href={href(tab.route, args())} class='tab' aria-current={isCurrent(tab.route, args()) ? 'page' : undefined}>
        {tab.children}
      </a>
    );
  };
  return (
    <div class='team' data-org={props.params.org}>
      <div class='team-head'>
        <h2>
          {orgs[props.params.org]?.name ?? props.params.org} <small>{orgs[props.params.org]?.region ?? ''}</small>
        </h2>
        <nav class='tabs' aria-label='Team'>
          <Tab route='team' args={{ tab: 'overview' }}>Overview</Tab>
          <Tab route='team' args={{ tab: 'members' }}>Members</Tab>
          <Tab route='team' args={{ tab: 'activity' }}>Activity</Tab>
          <Tab route='analytics'>Analytics</Tab>
          <Tab route='settings'>Settings</Tab>
          <Tab route='print'>Print</Tab>
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
