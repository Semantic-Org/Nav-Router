<script>
  // the page is the router's own cell under the scaffold, so a slot the root declares stays current
  let { page } = $props();
</script>

<nav class="crumbs" aria-label="Breadcrumb">{(page.titles ?? []).toReversed().join(' / ')}</nav>
