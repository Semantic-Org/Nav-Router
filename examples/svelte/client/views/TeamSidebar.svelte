<script>
  import { addMember, restoreMember, store } from '../store.svelte.js';

  let { params, data } = $props();
</script>

<div class="side-card">
  <h4>
    Members <span class="count">{data.members.length}</span>
  </h4>
  <ul class="list">
    {#each data.members as member (member.id)}
      <li>
        <a href={`/team/${member.org}/m/${member.id}`} class="item">
          <span class="dot" data-access={member.access}></span>
          {member.name}
        </a>
      </li>
    {/each}
  </ul>
  <div class="side-actions">
    <button type="button" onclick={() => addMember(params.org)}>Add member</button>
    <button type="button" onclick={restoreMember} disabled={store.removed.length === 0}>Restore removed</button>
  </div>
  <div class="filler">
    {#each { length: 30 }, index}
      <p class="muted">Scroll line {index + 1}</p>
    {/each}
  </div>
</div>
