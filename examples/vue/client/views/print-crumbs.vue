<script setup>
import { useViewContext } from '@nav-router/vue';

// the print page's own trail, an override of a slot the root declares, across the team layout
const context = useViewContext();
</script>

<template>
  <nav class="crumbs print-crumbs" aria-label="Breadcrumb">Print view of {{ context.params.org }}</nav>
</template>
