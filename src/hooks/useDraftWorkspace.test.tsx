import { streamDraft } from "api";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDraftWorkspace } from ".";

vi.mock("api", () => ({
  streamDraft: vi.fn(),
}));

const requestId = "00000000-0000-4000-8000-000000000001";
const initialTicketId = "billing-duplicate-charge";
const streamDraftMock = vi.mocked(streamDraft);

const enableReducedMotion = () => {
  const mediaQuery = {
    matches: true,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQuery),
  );
};

describe("useDraftWorkspace", () => {
  beforeEach(() => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(requestId);
    streamDraftMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("accumulates events from the draft transport", async () => {
    streamDraftMock.mockImplementation(async ({ onEvent }) => {
      onEvent({ type: "delta", requestId, text: "First sentence. " });
      onEvent({ type: "delta", requestId, text: "Second sentence." });
      onEvent({ type: "complete", requestId });
    });
    const { result } = renderHook(() => useDraftWorkspace(initialTicketId));

    await act(async () => {
      await result.current.generateDraft();
    });

    expect(result.current.state.phase).toBe("ready");
    expect(result.current.state.draft).toBe("First sentence. Second sentence.");
    expect(result.current.state.announcement).toBe("Suggestion ready. 2 sentences.");
    expect(streamDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: result.current.state.ticketId,
        requestId,
        signal: expect.any(AbortSignal),
        onEvent: expect.any(Function),
      }),
    );
  });

  it("aborts an active request and retains its partial draft", async () => {
    let requestSignal: AbortSignal | undefined;
    streamDraftMock.mockImplementation(
      ({ signal, onEvent }) =>
        new Promise((_resolve, reject) => {
          requestSignal = signal;
          onEvent({ type: "delta", requestId, text: "Partial reply" });
          signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );
    const { result } = renderHook(() => useDraftWorkspace(initialTicketId));
    let generation: Promise<void>;

    act(() => {
      generation = result.current.generateDraft();
    });
    await waitFor(() => expect(result.current.state.draft).toBe("Partial reply"));

    act(() => {
      result.current.stopGeneration();
    });
    await act(async () => {
      await generation;
    });

    expect(requestSignal?.aborted).toBe(true);
    expect(result.current.state.phase).toBe("stopped");
    expect(result.current.state.draft).toBe("Partial reply");
  });

  it("holds incomplete text until completion when reduced motion is preferred", async () => {
    enableReducedMotion();
    let completeStream: () => void = () => undefined;
    streamDraftMock.mockImplementation(
      ({ onEvent }) =>
        new Promise((resolve) => {
          onEvent({ type: "delta", requestId, text: "Buffered reply" });
          completeStream = () => {
            onEvent({ type: "complete", requestId });
            resolve();
          };
        }),
    );
    const { result } = renderHook(() => useDraftWorkspace(initialTicketId));
    let generation: Promise<void>;

    act(() => {
      generation = result.current.generateDraft();
    });
    await waitFor(() => expect(result.current.state.phase).toBe("streaming"));
    expect(result.current.state.draft).toBe("");

    await act(async () => {
      completeStream();
      await generation;
    });

    expect(result.current.state.phase).toBe("ready");
    expect(result.current.state.draft).toBe("Buffered reply");
  });

  it("flushes reduced-motion text before stopping generation", async () => {
    enableReducedMotion();
    streamDraftMock.mockImplementation(
      ({ signal, onEvent }) =>
        new Promise((_resolve, reject) => {
          onEvent({ type: "delta", requestId, text: "Buffered partial reply" });
          signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    );
    const { result } = renderHook(() => useDraftWorkspace(initialTicketId));
    let generation: Promise<void>;

    act(() => {
      generation = result.current.generateDraft();
    });
    await waitFor(() => expect(result.current.state.phase).toBe("streaming"));
    expect(result.current.state.draft).toBe("");

    act(() => result.current.stopGeneration());
    await act(async () => generation);

    expect(result.current.state.phase).toBe("stopped");
    expect(result.current.state.draft).toBe("Buffered partial reply");
  });

  it("exposes intent-based actions instead of the reducer dispatch function", () => {
    const { result } = renderHook(() => useDraftWorkspace(initialTicketId));

    act(() => {
      result.current.selectTicket("account-login-code");
      result.current.editDraft("Reviewed response.");
      result.current.approveDraft();
    });

    expect(result.current.state.ticketId).toBe("account-login-code");
    expect(result.current.state.draft).toBe("Reviewed response.");
    expect(result.current.state.phase).toBe("approved");
    expect(result.current).not.toHaveProperty("dispatch");
  });
});
