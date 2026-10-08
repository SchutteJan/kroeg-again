import { createAuthFragmentClient } from "@fragno-dev/auth/solid";
import { createSignal, onMount } from "solid-js";

export const authClient = createAuthFragmentClient();

/**
 * `authClient.useMe()`, but always reports `loading` until the component has mounted on the client.
 *
 * During SSR the fragno store calls the route handler directly, without the request's cookies, and
 * caches the (unauthenticated) result in a module-level store that lives across requests. The
 * client starts from a fresh store, so SSR and the first client render disagree and hydration
 * fails. Rendering the loading state on the server and during hydration keeps both sides in sync.
 */
export function useMe() {
  const me = authClient.useMe();
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  return {
    data: () => (mounted() ? me.data() : undefined),
    loading: () => !mounted() || me.loading(),
    error: () => (mounted() ? me.error() : undefined),
  };
}
