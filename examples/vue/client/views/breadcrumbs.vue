<script setup>
import { useViewContext } from '@nav-router/vue';

// the page is the router's own cell under the scaffold, so a slot the root declares stays current
const context = useViewContext();
</script>

<template>
  <nav class="crumbs" aria-label="Breadcrumb">{{ (context.page.titles ?? []).toReversed().join(' / ') }}</nav>
</template>
