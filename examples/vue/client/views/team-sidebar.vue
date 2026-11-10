<script setup>
import { useViewContext } from '@nav-router/vue';

import { addMember, removed, restoreMember } from '../store.js';

const context = useViewContext();
</script>

<template>
  <div class="side-card">
    <h4>
      Members <span class="count">{{ context.data.members.length }}</span>
    </h4>
    <ul class="list">
      <li v-for="member in context.data.members" :key="member.id">
        <a :href="`/team/${member.org}/m/${member.id}`" class="item">
          <span class="dot" :data-access="member.access"></span>
          {{ member.name }}
        </a>
      </li>
    </ul>
    <div class="side-actions">
      <button type="button" @click="addMember(context.params.org)">Add member</button>
      <button type="button" :disabled="removed.length === 0" @click="restoreMember">Restore removed</button>
    </div>
    <div class="filler">
      <p v-for="line in 30" :key="line" class="muted">Scroll line {{ line }}</p>
    </div>
  </div>
</template>
