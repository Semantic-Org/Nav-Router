<script setup>
import { useViewContext } from '@nav-router/vue';

import { renameMember } from '../store.js';

// the members are reactive, so a rename moves one name in place: the row keeps its element, the
// input keeps its focus, and only the reads of that name are told
const context = useViewContext();
</script>

<template>
  <section class="page">
    <h3>{{ context.params.tab[0].toUpperCase() + context.params.tab.slice(1) }}</h3>
    <table class="members">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Access</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="member in context.data.members" :key="member.id">
          <td>
            <input
              :value="member.name"
              :aria-label="`Name of ${member.id}`"
              @input="renameMember(member.id, $event.target.value)"
            />
          </td>
          <td>{{ member.role }}</td>
          <td>{{ member.access }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
