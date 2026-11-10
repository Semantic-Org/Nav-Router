<script setup>
import { navigate } from '@nav-router/vue';

import { signIn } from '../store.js';

const props = defineProps(['query']);
const enter = (role) => {
  signIn(role);
  navigate(props.query.returnTo ?? '/');
};
</script>

<template>
  <section class="page">
    <h1>Sign in</h1>
    <p>{{ query.returnTo ? `You will go back to ${query.returnTo}.` : 'You will go to the overview.' }}</p>
    <button type="button" @click="enter('member')">Sign in as member</button>
    <button type="button" @click="enter('admin')">Sign in as admin</button>
  </section>
</template>
