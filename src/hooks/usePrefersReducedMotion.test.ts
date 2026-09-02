import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePrefersReducedMotion } from ".";

const createMatchMedia = (initialMatches: boolean) => {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  const mediaQuery = {
    matches: initialMatches,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn((_type: string, nextListener: EventListener) => {
      listener = nextListener as (event: MediaQueryListEvent) => void;
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQuery),
  );

  return {
    mediaQuery,
    setMatches(matches: boolean) {
      mediaQuery.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
  };
};

describe("usePrefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the current reduced-motion preference", () => {
    createMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it("tracks preference changes and removes its listener on unmount", () => {
    const { mediaQuery, setMatches } = createMatchMedia(false);
    const { result, unmount } = renderHook(() => usePrefersReducedMotion());

    act(() => setMatches(true));
    expect(result.current).toBe(true);

    unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
