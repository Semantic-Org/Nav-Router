<script>
  import { href, isActive, isCurrent } from '@nav-router/svelte';

  // a link by route name: href builds it, and isActive or isCurrent reads the router's current page,
  // a cell under the scaffold, so aria-current follows every navigation with nothing wired. the
  // anchor is the app's: every other prop passes through to it and the component adds nothing of its own
  let { route, args, under = false, children, ...rest } = $props();
  const current = $derived(under ? isActive(route, args) : isCurrent(route, args));
</script>

<a href={href(route, args)} aria-current={current ? 'page' : undefined} {...rest}>{@render children()}</a>
