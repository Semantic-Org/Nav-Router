<script setup>
defineProps(['params', 'data']);
</script>

<!-- two roots, a heading and a table, so the view is a fragment -->
<template>
  <h3>Print view for {{ params.org }}</h3>
  <table class="print">
    <tbody>
      <tr v-for="member in data.members" :key="member.id">
        <td>{{ member.name }}</td>
        <td>{{ member.role }}</td>
      </tr>
    </tbody>
  </table>
</template>
