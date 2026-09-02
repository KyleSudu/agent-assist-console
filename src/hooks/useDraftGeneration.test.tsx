import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDraftGeneration } from "./useDraftGeneration";

const requestId = "00000000-0000-4000-8000-000000000001";
const encoder = new TextEncoder();

const event = (type: string, payload: Record<string, string> = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, requestId, ...payload })}\n\n`;

describe("useDraftGeneration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("accumulates a streamed reply and completes it", async () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(requestId);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(event("start")));
        controller.enqueue(encoder.encode(event("delta", { text: "First sentence. " })));
        controller.enqueue(encoder.encode(event("delta", { text: "Second sentence." })));
        controller.enqueue(encoder.encode(event("complete")));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useDraftGeneration());

    await act(async () => {
      await result.current.generate();
    });

    expect(result.current.state.phase).toBe("ready");
    expect(result.current.state.draft).toBe("First sentence. Second sentence.");
    expect(result.current.state.announcement).toBe("Suggestion ready. 2 sentences.");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/drafts/stream",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ticketId: result.current.state.ticketId, requestId }),
      }),
    );
  });

  it("aborts an active request and retains its partial draft", async () => {
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(requestId);
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    let requestSignal: AbortSignal | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
        controller.enqueue(encoder.encode(event("delta", { text: "Partial reply" })));
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        requestSignal = init?.signal instanceof AbortSignal ? init.signal : undefined;
        requestSignal?.addEventListener("abort", () => {
          streamController?.error(new DOMException("The operation was aborted.", "AbortError"));
        });
        return Promise.resolve(new Response(stream, { status: 200 }));
      }),
    );
    const { result } = renderHook(() => useDraftGeneration());
    let generation: Promise<void>;

    act(() => {
      generation = result.current.generate();
    });
    await waitFor(() => expect(result.current.state.draft).toBe("Partial reply"));

    act(() => {
      result.current.stop();
    });
    await act(async () => {
      await generation;
    });

    expect(requestSignal?.aborted).toBe(true);
    expect(result.current.state.phase).toBe("stopped");
    expect(result.current.state.draft).toBe("Partial reply");
    expect(result.current.state.announcement).toBe(
      "Generation stopped. Partial suggestion retained.",
    );
  });
});
