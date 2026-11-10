<script setup>
defineProps(['data']);
</script>

<template>
  <section class="page">
    <h3>Analytics for {{ data.org }}</h3>
    <dl class="stats">
      <dt>Latency</dt>
      <dd>{{ data.latency }}</dd>
      <dt>Uptime</dt>
      <dd>{{ data.uptime }}</dd>
    </dl>
  </section>
</template>
