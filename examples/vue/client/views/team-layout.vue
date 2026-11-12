<script setup>
import { RouterSlot, useViewContext } from '@nav-router/vue';

import { orgs } from '../store.js';
import RouteLink from './route-link.vue';

const context = useViewContext();
</script>

<template>
  <div class="team" :data-org="context.params.org">
    <div class="team-head">
      <h2>
        {{ orgs[context.params.org]?.name ?? context.params.org }}
        <small>{{ orgs[context.params.org]?.region ?? '' }}</small>
      </h2>
      <nav class="tabs" aria-label="Team">
        <RouteLink route="team" :args="{ org: context.params.org, tab: 'overview' }" class="tab">Overview</RouteLink>
        <RouteLink route="team" :args="{ org: context.params.org, tab: 'members' }" class="tab">Members</RouteLink>
        <RouteLink route="team" :args="{ org: context.params.org, tab: 'activity' }" class="tab">Activity</RouteLink>
        <RouteLink route="analytics" :args="{ org: context.params.org }" class="tab">Analytics</RouteLink>
        <RouteLink route="settings" :args="{ org: context.params.org }" class="tab">Settings</RouteLink>
        <RouteLink route="print" :args="{ org: context.params.org }" class="tab">Print</RouteLink>
      </nav>
    </div>
    <div class="team-body">
      <aside id="sidebar-scroll" class="sidebar" tabindex="0">
        <RouterSlot name="sidebar">
          <p class="muted fallback">No sidebar on this page.</p>
        </RouterSlot>
      </aside>
      <section class="content">
        <RouterSlot />
      </section>
    </div>
  </div>
</template>
