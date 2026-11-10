<script setup>
import { useViewContext } from '@nav-router/vue';
import { computed } from 'vue';

const context = useViewContext();
const pathname = computed(() => new URL(context.page.url, location.origin).pathname);
</script>

<template>
  <section class="page status" data-status="notFound">
    <h2>Not found</h2>
    <p>Nothing at {{ pathname }}.</p>
  </section>
</template>
