<script setup>
import { useViewContext } from '@nav-router/vue';

const context = useViewContext();
</script>

<!-- two roots, a heading and a table, so the view is a fragment -->
<template>
  <h3>Print view for {{ context.params.org }}</h3>
  <table class="print">
    <tbody>
      <tr v-for="member in context.data.members" :key="member.id">
        <td>{{ member.name }}</td>
        <td>{{ member.role }}</td>
      </tr>
    </tbody>
  </table>
</template>
