import { streamDraft } from "api";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { tickets, type DraftStreamEvent } from "shared";
import { createInitialDraftState, draftReducer } from "state";

export const useDraftWorkspace = () => {
  const [state, dispatch] = useReducer(draftReducer, tickets[0].id, createInitialDraftState);
  const controllerRef = useRef<AbortController | null>(null);

  const handleEvent = useCallback((event: DraftStreamEvent) => {
    if (event.type === "start") return;
    if (event.type === "delta") dispatch(event);
    if (event.type === "complete") dispatch(event);
    if (event.type === "error") dispatch({ type: "error", requestId: event.requestId });
  }, []);

  const selectTicket = useCallback((ticketId: string) => {
    dispatch({ type: "select-ticket", ticketId });
  }, []);

  const generateDraft = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = crypto.randomUUID();
    controllerRef.current = controller;
    dispatch({ type: "start", requestId });

    try {
      await streamDraft({
        ticketId: state.ticketId,
        requestId,
        signal: controller.signal,
        onEvent: handleEvent,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        dispatch({ type: "error", requestId });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [handleEvent, state.ticketId]);

  const stopGeneration = useCallback(() => {
    if (!state.requestId) return;
    const requestId = state.requestId;
    controllerRef.current?.abort();
    controllerRef.current = null;
    dispatch({ type: "stop", requestId });
  }, [state.requestId]);

  const editDraft = useCallback((text: string) => {
    dispatch({ type: "edit", text });
  }, []);

  const approveDraft = useCallback(() => {
    dispatch({ type: "approve" });
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return {
    state,
    selectTicket,
    generateDraft,
    stopGeneration,
    editDraft,
    approveDraft,
  };
};
