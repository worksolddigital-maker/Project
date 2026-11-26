import { navigate, useRoute } from "../router";

/** `next/navigation` replacement for the standalone build. */
export function usePathname(): string {
  return `/${useRoute() || "dashboard"}`;
}

export function useRouter() {
  return { push: navigate, replace: navigate, refresh: () => {}, back: () => history.back(), prefetch: () => {} };
}
