<script setup>
import { computed, provide } from 'vue';

import { orgs } from '../store.js';
import NavLink from './nav-link.vue';

const props = defineProps(['params']);
const team = computed(() => orgs[props.params.org]);
// provided from the layout's setup, so the pages and slots inside it inject the team
provide('team', team);
</script>

<template>
  <div class="team" :data-org="params.org">
    <div class="team-head">
      <h2>
        {{ team?.name ?? params.org }} <small>{{ team?.region ?? '' }}</small>
      </h2>
      <nav class="tabs" aria-label="Team">
        <NavLink class="tab" route="team" :args="{ org: params.org, tab: 'overview' }">Overview</NavLink>
        <NavLink class="tab" route="team" :args="{ org: params.org, tab: 'members' }">Members</NavLink>
        <NavLink class="tab" route="team" :args="{ org: params.org, tab: 'activity' }">Activity</NavLink>
        <NavLink class="tab" route="analytics" :args="{ org: params.org }">Analytics</NavLink>
        <NavLink class="tab" route="settings" :args="{ org: params.org }">Settings</NavLink>
        <NavLink class="tab" route="print" :args="{ org: params.org }">Print</NavLink>
      </nav>
    </div>
    <div class="team-body">
      <aside id="sidebar-scroll" class="sidebar" tabindex="0">
        <component is="slot" name="sidebar">
          <p class="muted fallback">No sidebar on this page.</p>
        </component>
      </aside>
      <section class="content">
        <component is="slot" />
      </section>
    </div>
  </div>
</template>
