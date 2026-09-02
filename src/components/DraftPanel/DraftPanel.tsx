import * as React from "react";
import type { DraftState } from "state";

type DraftPanelProps = {
  state: DraftState;
  onGenerate: () => void;
  onStop: () => void;
  onEdit: (text: string) => void;
  onApprove: () => void;
};

export const DraftPanel = ({ state, onGenerate, onStop, onEdit, onApprove }: DraftPanelProps) => {
  const isStreaming = state.phase === "streaming";
  const isApproved = state.phase === "approved";

  return (
    <section aria-labelledby="draft-heading" className="panel">
      <div className="draft-heading">
        <h2 id="draft-heading">Suggested reply</h2>
        <span className={`state-badge state-${state.phase}`}>{state.phase.replace("-", " ")}</span>
      </div>

      <div className="actions actions-top">
        {!isStreaming ? (
          <button type="button" onClick={onGenerate}>
            {state.draft ? "Generate again" : "Draft reply"}
          </button>
        ) : (
          <button type="button" className="button-stop" onClick={onStop}>
            Stop generating
          </button>
        )}
      </div>

      <label htmlFor="draft-text">Reply text</label>
      <textarea
        id="draft-text"
        value={state.draft}
        placeholder="The generated suggestion will appear here."
        readOnly={isStreaming || isApproved}
        onChange={(event) => onEdit(event.target.value)}
      />

      <div className="actions">
        <button
          type="button"
          className="button-primary"
          disabled={!state.draft.trim() || isStreaming || isApproved}
          onClick={onApprove}
        >
          Approve reply
        </button>
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {state.announcement}
      </div>
    </section>
  );
};
