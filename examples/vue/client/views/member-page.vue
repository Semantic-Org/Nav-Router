<script setup>
import { inject } from 'vue';

import { removeMember, renameMember } from '../store.js';

defineProps(['params', 'query', 'data']);
// the team layout's own provide, across the slot this page fills
const team = inject('team');
</script>

<!-- the view's root changes with the query: a list for the activity, an article for the profile -->
<template>
  <ul v-if="query.section === 'activity'" class="page activity">
    <li>{{ data.member.name }} pushed three commits</li>
    <li>Reviewed two pull requests</li>
    <li>
      <a :href="`/team/${params.org}/m/${params.id}`">Back to profile</a>
    </li>
  </ul>
  <article v-else class="page member">
    <h3>{{ data.member.name }}</h3>
    <p class="muted">{{ data.member.role }} · {{ team.name }}</p>
    <label>
      Name
      <input :value="data.member.name" @input="renameMember(params.id, $event.target.value)" />
    </label>
    <nav class="sub">
      <a :href="`/team/${params.org}/m/${params.id}`">Profile</a>
      <a :href="`/team/${params.org}/m/${params.id}?section=activity`">Activity</a>
    </nav>
    <button type="button" class="danger" @click="removeMember(params.id)">Remove {{ data.member.name }}</button>
  </article>
</template>
