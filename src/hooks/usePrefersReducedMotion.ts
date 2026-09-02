import { useSyncExternalStore } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

const getSnapshot = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(reducedMotionQuery).matches;

const getServerSnapshot = () => false;

const subscribe = (onStoreChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => undefined;

  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
};

/**
 * Reports whether the operating system currently requests reduced motion. The value updates when that preference changes while the application is open.
 */
export const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
