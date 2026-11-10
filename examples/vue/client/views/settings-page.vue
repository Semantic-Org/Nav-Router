<script setup>
defineProps(['params']);
</script>

<template>
  <section class="page">
    <h3>Settings for {{ params.org }}</h3>
    <p>Only an admin sees this. Sign out above and it leaves in place.</p>
    <label>
      Team name <input :value="params.org" />
    </label>
  </section>
</template>
