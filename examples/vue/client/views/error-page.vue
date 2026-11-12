<script setup>
import { useViewContext } from '@nav-router/vue';

const context = useViewContext();
</script>

<template>
  <section class="page status" data-status="error">
    <h2>Something broke</h2>
    <p>{{ context.page.error?.message ?? 'Navigation failed' }}</p>
    <a href="/" class="btn">Return home</a>
  </section>
</template>
