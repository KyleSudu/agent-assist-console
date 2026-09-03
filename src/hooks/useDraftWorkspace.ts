import { streamDraft } from "api";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { DraftStreamEvent } from "shared";
import { createInitialDraftState, draftReducer } from "state";
import { createDraftDeltaBuffer } from "streaming";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export const useDraftWorkspace = (initialTicketId: string) => {
  const [state, dispatch] = useReducer(draftReducer, initialTicketId, createInitialDraftState);
  const controllerRef = useRef<AbortController | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  const draftDeltaBuffer = useMemo(
    () =>
      createDraftDeltaBuffer({
        onFlush: ({ requestId, text }) => dispatch({ type: "delta", requestId, text }),
      }),
    [],
  );

  const handleEvent = useCallback(
    (event: DraftStreamEvent) => {
      if (event.type === "start") return;
      if (event.type === "delta") {
        if (prefersReducedMotionRef.current) {
          draftDeltaBuffer.push(event);
        } else {
          dispatch(event);
        }
        return;
      }

      draftDeltaBuffer.flush();
      if (event.type === "complete") dispatch(event);
      if (event.type === "error") dispatch({ type: "error", requestId: event.requestId });
    },
    [draftDeltaBuffer],
  );

  const selectTicket = useCallback(
    (ticketId: string) => {
      draftDeltaBuffer.clear();
      dispatch({ type: "select-ticket", ticketId });
    },
    [draftDeltaBuffer],
  );

  const generateDraft = useCallback(async () => {
    controllerRef.current?.abort();
    draftDeltaBuffer.clear();
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
        draftDeltaBuffer.flush();
        dispatch({ type: "error", requestId });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [draftDeltaBuffer, handleEvent, state.ticketId]);

  const stopGeneration = useCallback(() => {
    if (!state.requestId) return;
    const requestId = state.requestId;
    draftDeltaBuffer.flush();
    controllerRef.current?.abort();
    controllerRef.current = null;
    dispatch({ type: "stop", requestId });
  }, [draftDeltaBuffer, state.requestId]);

  const editDraft = useCallback((text: string) => {
    dispatch({ type: "edit", text });
  }, []);

  const approveDraft = useCallback(() => {
    dispatch({ type: "approve" });
  }, []);

  useEffect(() => {
    prefersReducedMotionRef.current = prefersReducedMotion;
    if (!prefersReducedMotion) draftDeltaBuffer.flush();
  }, [draftDeltaBuffer, prefersReducedMotion]);

  useEffect(
    () => () => {
      draftDeltaBuffer.clear();
      controllerRef.current?.abort();
    },
    [draftDeltaBuffer],
  );

  return {
    state,
    selectTicket,
    generateDraft,
    stopGeneration,
    editDraft,
    approveDraft,
  };
};
