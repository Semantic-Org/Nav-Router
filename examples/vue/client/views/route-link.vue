<script setup>
import { href, isActive, isCurrent } from '@nav-router/vue';

// a link by route name: href builds it, and isActive or isCurrent reads the router's current page,
// a cell under the scaffold, so aria-current follows every navigation with nothing wired. the
// anchor is the app's: every other attribute falls through to it
defineProps({ route: String, args: Object, under: Boolean });
</script>

<template>
  <a
    :href="href(route, args)"
    :aria-current="(under ? isActive(route, args) : isCurrent(route, args)) ? 'page' : undefined"
  >
    <slot />
  </a>
</template>
