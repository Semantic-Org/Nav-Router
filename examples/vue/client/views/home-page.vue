<script setup>
import { useViewContext } from '@nav-router/vue';

import { user } from '../store.js';

const context = useViewContext();
</script>

<template>
  <section class="page">
    <h1>Overview</h1>
    <p>{{ context.data.memberCount }} members across the company.</p>
    <p>Signed in as {{ user?.name ?? 'nobody' }}.</p>
    <a href="/team/acme" class="btn">Open Team Acme</a>
  </section>
</template>
