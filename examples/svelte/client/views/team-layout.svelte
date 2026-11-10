<script>
  import { href, isCurrent, Slot } from '@nav-router/svelte';

  import { orgs } from '../store.svelte.js';

  let { params } = $props();
</script>

{#snippet tab(label, route, args)}
  {@const all = { org: params.org, ...args }}
  <a href={href(route, all)} class="tab" aria-current={isCurrent(route, all) ? 'page' : undefined}>{label}</a>
{/snippet}

<div class="team" data-org={params.org}>
  <div class="team-head">
    <h2>
      {orgs[params.org]?.name ?? params.org} <small>{orgs[params.org]?.region ?? ''}</small>
    </h2>
    <nav class="tabs" aria-label="Team">
      {@render tab('Overview', 'team', { tab: 'overview' })}
      {@render tab('Members', 'team', { tab: 'members' })}
      {@render tab('Activity', 'team', { tab: 'activity' })}
      {@render tab('Analytics', 'analytics')}
      {@render tab('Settings', 'settings')}
      {@render tab('Print', 'print')}
    </nav>
  </div>
  <div class="team-body">
    <!-- svelte-ignore a11y_no_noninteractive_tabindex: a scroll container, reached by keyboard -->
    <aside id="sidebar-scroll" class="sidebar" tabindex="0">
      <Slot name="sidebar">
        <p class="muted fallback">No sidebar on this page.</p>
      </Slot>
    </aside>
    <section class="content">
      <Slot />
    </section>
  </div>
</div>
