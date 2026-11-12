<!-- two roots, a heading and a table -->
<script>
  let { data, params } = $props();
</script>

<h3>Print view for {params.org}</h3>
<table class="print">
  <tbody>
    {#each data.members as member (member.id)}
      <tr>
        <td>{member.name}</td>
        <td>{member.role}</td>
      </tr>
    {/each}
  </tbody>
</table>
