<script setup>
// the print page's own trail, an override of a slot the root declares, across the team layout
defineProps(['params']);
</script>

<template>
  <nav class="crumbs print-crumbs" aria-label="Breadcrumb">Print view of {{ params.org }}</nav>
</template>
