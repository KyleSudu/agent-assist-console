import { describe, expect, it } from "vitest";
import { draftReducer, initialDraftState } from "./draftReducer";

describe("draftReducer", () => {
  it("streams a draft to completion without narrating deltas", () => {
    const started = draftReducer(initialDraftState, { type: "start", requestId: "request-1" });
    const streamed = draftReducer(started, {
      type: "delta",
      requestId: "request-1",
      text: "First sentence. Second sentence.",
    });
    const completed = draftReducer(streamed, { type: "complete", requestId: "request-1" });

    expect(streamed.announcement).toBe("Generating suggested reply.");
    expect(completed.phase).toBe("ready");
    expect(completed.announcement).toBe("Suggestion ready. 2 sentences.");
  });

  it("keeps partial text when generation stops", () => {
    const started = draftReducer(initialDraftState, { type: "start", requestId: "request-1" });
    const streamed = draftReducer(started, {
      type: "delta",
      requestId: "request-1",
      text: "Partial",
    });
    const stopped = draftReducer(streamed, { type: "stop", requestId: "request-1" });

    expect(stopped.phase).toBe("stopped");
    expect(stopped.draft).toBe("Partial");
    expect(stopped.announcement).toContain("Partial suggestion retained");
  });

  it("ignores a late event from an old request", () => {
    const active = draftReducer(initialDraftState, { type: "start", requestId: "request-2" });
    const result = draftReducer(active, { type: "delta", requestId: "request-1", text: "stale" });

    expect(result).toBe(active);
  });
});
