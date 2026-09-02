export type DraftPhase =
  "idle" | "streaming" | "stopped" | "ready" | "editing" | "approved" | "error";

export type DraftState = {
  ticketId: string;
  phase: DraftPhase;
  requestId: string | null;
  draft: string;
  announcement: string;
};

export type DraftAction =
  | { type: "select-ticket"; ticketId: string }
  | { type: "start"; requestId: string }
  | { type: "delta"; requestId: string; text: string }
  | { type: "complete"; requestId: string }
  | { type: "stop"; requestId: string }
  | { type: "edit"; text: string }
  | { type: "approve" }
  | { type: "error"; requestId: string };

export const createInitialDraftState = (ticketId: string): DraftState => ({
  ticketId,
  phase: "idle",
  requestId: null,
  draft: "",
  announcement: "",
});

const sentenceCount = (text: string) => text.match(/[.!?](?:\s|$)/g)?.length ?? 0;

const isStale = (state: DraftState, requestId: string) => state.requestId !== requestId;

export const draftReducer = (state: DraftState, action: DraftAction): DraftState => {
  switch (action.type) {
    case "select-ticket":
      return createInitialDraftState(action.ticketId);
    case "start":
      return {
        ...state,
        phase: "streaming",
        requestId: action.requestId,
        draft: "",
        announcement: "Generating suggested reply.",
      };
    case "delta":
      if (isStale(state, action.requestId) || state.phase !== "streaming") return state;
      return { ...state, draft: state.draft + action.text };
    case "complete":
      if (isStale(state, action.requestId) || state.phase !== "streaming") return state;
      return {
        ...state,
        phase: "ready",
        requestId: null,
        announcement: `Suggestion ready. ${sentenceCount(state.draft)} sentences.`,
      };
    case "stop":
      if (isStale(state, action.requestId) || state.phase !== "streaming") return state;
      return {
        ...state,
        phase: "stopped",
        requestId: null,
        announcement: "Generation stopped. Partial suggestion retained.",
      };
    case "edit":
      if (state.phase === "streaming" || state.phase === "approved") return state;
      return { ...state, phase: "editing", draft: action.text };
    case "approve":
      if (!state.draft.trim() || state.phase === "streaming") return state;
      return {
        ...state,
        phase: "approved",
        announcement: "Suggestion approved.",
      };
    case "error":
      if (isStale(state, action.requestId)) return state;
      return {
        ...state,
        phase: "error",
        requestId: null,
        announcement: "Suggestion could not be generated. Try again.",
      };
  }
};
