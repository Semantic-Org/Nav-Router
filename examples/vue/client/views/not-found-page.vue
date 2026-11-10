<script setup>
import { computed } from 'vue';

const props = defineProps(['page']);
const path = computed(() => new URL(props.page.url, location.origin).pathname);
</script>

<template>
  <section class="page status" data-status="notFound">
    <h2>Not found</h2>
    <p>Nothing at {{ path }}.</p>
  </section>
</template>
