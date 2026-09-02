import { afterEach, describe, expect, it, vi } from "vitest";
import { createDraftDeltaBuffer, type BufferedDraftDelta } from ".";

const requestId = "request-1";

describe("createDraftDeltaBuffer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes accumulated text after the maximum delay", () => {
    vi.useFakeTimers();
    const onFlush = vi.fn<(delta: BufferedDraftDelta) => void>();
    const buffer = createDraftDeltaBuffer({ onFlush, flushDelayMs: 1_000 });

    buffer.push({ requestId, text: "Partial " });
    buffer.push({ requestId, text: "sentence" });
    vi.advanceTimersByTime(999);
    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFlush).toHaveBeenCalledWith({ requestId, text: "Partial sentence" });
  });

  it("flushes completed sentences while retaining the unfinished remainder", () => {
    const onFlush = vi.fn<(delta: BufferedDraftDelta) => void>();
    const buffer = createDraftDeltaBuffer({ onFlush });

    buffer.push({ requestId, text: "First sentence. Part" });
    expect(onFlush).toHaveBeenCalledWith({ requestId, text: "First sentence." });

    buffer.flush();
    expect(onFlush).toHaveBeenLastCalledWith({ requestId, text: " Part" });
  });

  it("flushes pending text on demand", () => {
    const onFlush = vi.fn<(delta: BufferedDraftDelta) => void>();
    const buffer = createDraftDeltaBuffer({ onFlush });

    buffer.push({ requestId, text: "Unfinished response" });
    buffer.flush();

    expect(onFlush).toHaveBeenCalledWith({ requestId, text: "Unfinished response" });
  });

  it("clears pending text and its timer without flushing", () => {
    vi.useFakeTimers();
    const onFlush = vi.fn<(delta: BufferedDraftDelta) => void>();
    const buffer = createDraftDeltaBuffer({ onFlush });

    buffer.push({ requestId, text: "Discard this" });
    buffer.clear();
    vi.runAllTimers();

    expect(onFlush).not.toHaveBeenCalled();
  });
});
