import { useCallback, useEffect, useReducer, useRef } from "react";
import type { DraftStreamEvent } from "../../shared/contracts";
import { draftReducer, initialDraftState } from "../state/draftReducer";
import { createSseParser } from "../streaming/parseSse";

export const useDraftGeneration = () => {
  const [state, dispatch] = useReducer(draftReducer, initialDraftState);
  const controllerRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: DraftStreamEvent) => {
    if (event.type === "start") return;
    if (event.type === "delta") dispatch(event);
    if (event.type === "complete") dispatch(event);
    if (event.type === "error") dispatch({ type: "error", requestId: event.requestId });
  }, []);

  const generate = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = crypto.randomUUID();
    controllerRef.current = controller;
    dispatch({ type: "start", requestId });

    try {
      const response = await fetch("/api/drafts/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: state.ticketId, requestId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true })).forEach(handleEvent);
      }
      parser.push(decoder.decode()).forEach(handleEvent);
      parser.flush().forEach(handleEvent);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        dispatch({ type: "error", requestId });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [handleEvent, state.ticketId]);

  const stop = useCallback(() => {
    if (!state.requestId) return;
    const requestId = state.requestId;
    controllerRef.current?.abort();
    controllerRef.current = null;
    dispatch({ type: "stop", requestId });
  }, [state.requestId]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { state, dispatch, generate, stop };
};
