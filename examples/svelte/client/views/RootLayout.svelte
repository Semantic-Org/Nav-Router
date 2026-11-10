<script>
  import { signIn, store } from '../store.svelte.js';
  import Link from './Link.svelte';
</script>

<!-- svelte's compiler takes a bare <slot> for its own, so the platform's element is written through svelte:element -->
<div class="shell">
  <header class="top">
    <a href="/" class="brand">Acme Console</a>
    <svelte:element this={'slot'} name="breadcrumbs"></svelte:element>
    <nav class="links" aria-label="Primary">
      <Link route="home">Overview</Link>
      <Link route="team" args={{ org: 'acme' }} under>Acme</Link>
      <Link route="team" args={{ org: 'globex' }} under>Globex</Link>
      <Link route="analytics" args={{ org: 'acme' }}>Analytics</Link>
      <Link route="settings" args={{ org: 'acme' }}>Settings</Link>
      <Link route="legacyDocs">Old docs</Link>
    </nav>
    <div class="who">
      <span class="badge" data-role={store.user?.role ?? 'none'}>
        {store.user ? `${store.user.name} (${store.user.role})` : 'Signed out'}
      </span>
      <button type="button" onclick={() => signIn(null)}>Out</button>
      <button type="button" onclick={() => signIn('member')}>Member</button>
      <button type="button" onclick={() => signIn('admin')}>Admin</button>
    </div>
  </header>
  <main class="body">
    <svelte:element this={'slot'}></svelte:element>
  </main>
</div>
