<script setup>
import { href, isActive, isCurrent } from '@nav-router/vue';

// a link by route name: href builds it, and isActive or isCurrent reads the router's current page,
// a cell under the scaffold, so aria-current follows every navigation with nothing wired. the
// anchor is the app's: every attribute it is not declared to take falls through to it
const props = defineProps({ route: String, args: Object, under: Boolean });
const current = () => (props.under ? isActive(props.route, props.args) : isCurrent(props.route, props.args));
</script>

<template>
  <a :href="href(route, args)" :aria-current="current() ? 'page' : undefined"><slot /></a>
</template>
