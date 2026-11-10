<script setup>
import { inject } from 'vue';

import { signIn, user } from '../store.js';
import NavLink from './nav-link.vue';

const brand = inject('brand');
</script>

<!-- a template's own slot tag is vue's, so the element the router fills is written with is="slot" -->
<template>
  <div class="shell">
    <header class="top">
      <a href="/" class="brand">{{ brand }}</a>
      <component is="slot" name="breadcrumbs" />
      <nav class="links" aria-label="Primary">
        <NavLink route="home">Overview</NavLink>
        <NavLink route="team" :args="{ org: 'acme' }" under>Acme</NavLink>
        <NavLink route="team" :args="{ org: 'globex' }" under>Globex</NavLink>
        <NavLink route="analytics" :args="{ org: 'acme' }">Analytics</NavLink>
        <NavLink route="settings" :args="{ org: 'acme' }">Settings</NavLink>
        <NavLink route="legacyDocs">Old docs</NavLink>
      </nav>
      <div class="who">
        <span class="badge" :data-role="user?.role ?? 'none'">
          {{ user ? `${user.name} (${user.role})` : 'Signed out' }}
        </span>
        <button type="button" @click="signIn(null)">Out</button>
        <button type="button" @click="signIn('member')">Member</button>
        <button type="button" @click="signIn('admin')">Admin</button>
      </div>
    </header>
    <main class="body">
      <component is="slot" />
    </main>
  </div>
</template>
