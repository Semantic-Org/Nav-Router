<script setup>
import { useViewContext } from '@nav-router/vue';

const context = useViewContext();
</script>

<template>
  <section class="page">
    <h3>Analytics for {{ context.data.org }}</h3>
    <dl class="stats">
      <dt>Latency</dt>
      <dd>{{ context.data.latency }}</dd>
      <dt>Uptime</dt>
      <dd>{{ context.data.uptime }}</dd>
    </dl>
  </section>
</template>
