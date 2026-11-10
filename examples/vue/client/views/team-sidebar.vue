<script setup>
import { addMember, removed, restoreMember } from '../store.js';

defineProps(['params', 'data']);
</script>

<template>
  <div class="side-card">
    <h4>
      Members <span class="count">{{ data.members.length }}</span>
    </h4>
    <ul class="list">
      <li v-for="member in data.members" :key="member.id">
        <a :href="`/team/${member.org}/m/${member.id}`" class="item">
          <span class="dot" :data-access="member.access"></span>
          {{ member.name }}
        </a>
      </li>
    </ul>
    <div class="side-actions">
      <button type="button" @click="addMember(params.org)">Add member</button>
      <button type="button" :disabled="removed.length === 0" @click="restoreMember">Restore removed</button>
    </div>
    <div class="filler">
      <p v-for="index in 30" :key="index" class="muted">Scroll line {{ index }}</p>
    </div>
  </div>
</template>
