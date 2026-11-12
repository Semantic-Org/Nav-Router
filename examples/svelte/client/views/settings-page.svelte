<script>
  let { params } = $props();
</script>

<section class="page">
  <h3>Settings for {params.org}</h3>
  <p>Only an admin sees this. Switch to member above and it leaves in place.</p>
  <label>
    Team name <input value={params.org} />
  </label>
</section>
