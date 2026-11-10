<script setup>
import { RouterSlot } from '@nav-router/vue';

import { signIn, user } from '../store.js';
import RouteLink from './route-link.vue';
</script>

<template>
  <div class="shell">
    <header class="top">
      <a href="/" class="brand">Acme Console</a>
      <RouterSlot name="breadcrumbs" />
      <nav class="links" aria-label="Primary">
        <RouteLink route="home">Overview</RouteLink>
        <RouteLink route="team" :args="{ org: 'acme' }" under>Acme</RouteLink>
        <RouteLink route="team" :args="{ org: 'globex' }" under>Globex</RouteLink>
        <RouteLink route="analytics" :args="{ org: 'acme' }">Analytics</RouteLink>
        <RouteLink route="settings" :args="{ org: 'acme' }">Settings</RouteLink>
        <RouteLink route="legacyDocs">Old docs</RouteLink>
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
      <RouterSlot />
    </main>
  </div>
</template>
