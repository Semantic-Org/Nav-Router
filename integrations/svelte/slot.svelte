<!--
  where a layout shows what is inside it: the views below, or the named slot a route declares.
  svelte compiles a <slot> tag away as its own legacy slot, so the element the router looks for
  is written through svelte:element. the children are the slot's fallback
-->
<script>
  let { name, children } = $props();
</script>

<svelte:element this={'slot'} {name}>{@render children?.()}</svelte:element>
