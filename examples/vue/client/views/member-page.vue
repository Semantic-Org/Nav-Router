<script setup>
import { useViewContext } from '@nav-router/vue';

import { removeMember, renameMember } from '../store.js';

const context = useViewContext();
</script>

<!-- the view's root changes with the query: an article for the profile, a list for the activity -->
<template>
  <ul v-if="context.query.section === 'activity'" class="page activity">
    <li>{{ context.data.member.name }} pushed three commits</li>
    <li>Reviewed two pull requests</li>
    <li>
      <a :href="`/team/${context.params.org}/m/${context.params.id}`">Back to profile</a>
    </li>
  </ul>
  <article v-else class="page member">
    <h3>{{ context.data.member.name }}</h3>
    <p class="muted">{{ context.data.member.role }} · {{ context.data.member.org }}</p>
    <label>
      Name
      <input :value="context.data.member.name" @input="renameMember(context.params.id, $event.target.value)" />
    </label>
    <nav class="sub">
      <a :href="`/team/${context.params.org}/m/${context.params.id}`">Profile</a>
      <a :href="`/team/${context.params.org}/m/${context.params.id}?section=activity`">Activity</a>
    </nav>
    <button type="button" class="danger" @click="removeMember(context.params.id)">
      Remove {{ context.data.member.name }}
    </button>
  </article>
</template>
