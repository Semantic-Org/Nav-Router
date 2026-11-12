<script>
  import { navigate } from '@nav-router/svelte';

  import { signIn } from '../store.svelte.js';

  let { query } = $props();

  const enter = (role) => {
    signIn(role);
    navigate(query.returnTo ?? '/');
  };
</script>

<section class="page">
  <h1>Sign in</h1>
  <p>{query.returnTo ? `You will go back to ${query.returnTo}.` : 'You will go to the overview.'}</p>
  <button type="button" onclick={() => enter('member')}>Sign in as member</button>
  <button type="button" onclick={() => enter('admin')}>Sign in as admin</button>
</section>
