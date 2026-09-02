import { getTicket, tickets } from "../shared/tickets";
import { useDraftGeneration } from "./hooks/useDraftGeneration";
import "./styles.css";

export const App = () => {
  const { state, dispatch, generate, stop } = useDraftGeneration();
  const ticket = getTicket(state.ticketId) ?? tickets[0];
  const isStreaming = state.phase === "streaming";
  const isApproved = state.phase === "approved";

  return (
    <main className="shell">
      <header className="page-header">
        <p className="eyebrow">Support operations</p>
        <h1>Agent Assist Console</h1>
        <p>Review a suggested response before approving it for a synthetic support ticket.</p>
      </header>

      <div className="workspace">
        <section aria-labelledby="ticket-heading" className="panel">
          <h2 id="ticket-heading">Customer ticket</h2>
          <label htmlFor="ticket-select">Select a synthetic ticket</label>
          <select
            id="ticket-select"
            value={state.ticketId}
            disabled={isStreaming}
            onChange={(event) => dispatch({ type: "select-ticket", ticketId: event.target.value })}
          >
            {tickets.map((option) => (
              <option key={option.id} value={option.id}>
                {option.subject}
              </option>
            ))}
          </select>

          <article className="ticket">
            <p className="ticket-customer">From {ticket.customerName}</p>
            <h3>{ticket.subject}</h3>
            <p>{ticket.body}</p>
          </article>
        </section>

        <section aria-labelledby="draft-heading" className="panel">
          <div className="draft-heading">
            <h2 id="draft-heading">Suggested reply</h2>
            <span className={`state-badge state-${state.phase}`}>{state.phase.replace("-", " ")}</span>
          </div>

          <div className="actions actions-top">
            {!isStreaming ? (
              <button type="button" onClick={() => void generate()}>
                {state.draft ? "Generate again" : "Draft reply"}
              </button>
            ) : (
              <button type="button" className="button-stop" onClick={stop}>
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
            onChange={(event) => dispatch({ type: "edit", text: event.target.value })}
          />

          <div className="actions">
            <button
              type="button"
              className="button-primary"
              disabled={!state.draft.trim() || isStreaming || isApproved}
              onClick={() => dispatch({ type: "approve" })}
            >
              Approve reply
            </button>
          </div>

          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {state.announcement}
          </div>
        </section>
      </div>
    </main>
  );
};
