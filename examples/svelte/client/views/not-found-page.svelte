<script>
  let { page } = $props();
</script>

<section class="page status" data-status="notFound">
  <h2>Not found</h2>
  <p>Nothing at {new URL(page.url, location.origin).pathname}.</p>
</section>
