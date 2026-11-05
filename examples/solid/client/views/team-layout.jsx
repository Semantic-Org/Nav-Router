import { isHere, orgs } from '../store.js';

export const TeamLayout = (props) => {
  const base = () => `/team/${props.params.org}`;
  const Tab = (tab) => (
    <a href={base() + tab.path} class='tab' aria-current={isHere(base() + tab.path) ? 'page' : undefined}>
      {tab.children}
    </a>
  );
  return (
    <div class='team' data-org={props.params.org}>
      <div class='team-head'>
        <h2>
          {orgs[props.params.org]?.name ?? props.params.org} <small>{orgs[props.params.org]?.region ?? ''}</small>
        </h2>
        <nav class='tabs' aria-label='Team'>
          <Tab path=''>Overview</Tab>
          <Tab path='/members'>Members</Tab>
          <Tab path='/activity'>Activity</Tab>
          <Tab path='/analytics'>Analytics</Tab>
          <Tab path='/settings'>Settings</Tab>
          <Tab path='/print'>Print</Tab>
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
