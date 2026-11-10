<!--
  the members are deep state, so a rename moves one name in place: the row keeps its element,
  the input keeps its focus, and only the reads of that name are told
-->
<script>
  import { renameMember } from '../store.svelte.js';

  let { data, params } = $props();
</script>

<section class="page">
  <h3>{params.tab[0].toUpperCase() + params.tab.slice(1)}</h3>
  <table class="members">
    <thead>
      <tr>
        <th>Name</th>
        <th>Role</th>
        <th>Access</th>
      </tr>
    </thead>
    <tbody>
      {#each data.members as member (member.id)}
        <tr>
          <td>
            <input
              value={member.name}
              oninput={(event) => renameMember(member.id, event.target.value)}
              aria-label={`Name of ${member.id}`}
            />
          </td>
          <td>{member.role}</td>
          <td>{member.access}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>
