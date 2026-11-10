<script setup>
import { user } from '../store.js';

defineProps(['data']);
</script>

<template>
  <section class="page">
    <h1>Overview</h1>
    <p>{{ data.memberCount }} members across the company.</p>
    <p>Signed in as {{ user?.name ?? 'nobody' }}.</p>
    <a href="/team/acme" class="btn">Open Team Acme</a>
  </section>
</template>
