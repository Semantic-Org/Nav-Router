<script setup>
import { useViewContext } from '@nav-router/vue';

const context = useViewContext();
</script>

<template>
  <section class="page">
    <h3>Settings for {{ context.params.org }}</h3>
    <p>Only an admin sees this. Sign out above and it leaves in place.</p>
    <label>
      Team name <input :value="context.params.org" />
    </label>
  </section>
</template>
