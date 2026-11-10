<script>
  import { store } from '../store.svelte.js';

  let { data } = $props();
</script>

<section class="page">
  <h1>Overview</h1>
  <p>{data.memberCount} members across the company.</p>
  <p>Signed in as {store.user?.name ?? 'nobody'}.</p>
  <a href="/team/acme" class="btn">Open Team Acme</a>
</section>
