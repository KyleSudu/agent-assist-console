import * as React from "react";
import { DraftPanel, TicketPanel } from "components";
import { useDraftWorkspace } from "hooks";
import { getTicket, tickets } from "shared";
import "./styles.css";

export const App = () => {
  const { state, selectTicket, generateDraft, stopGeneration, editDraft, approveDraft } =
    useDraftWorkspace(tickets[0].id);
  const ticket = getTicket(state.ticketId) ?? tickets[0];

  return (
    <main className="shell">
      <header className="page-header">
        <p className="eyebrow">Support operations</p>
        <h1>Agent Assist Console</h1>
        <p>Review a suggested response before approving it for a synthetic support ticket.</p>
      </header>

      <div className="workspace">
        <TicketPanel
          tickets={tickets}
          selectedTicket={ticket}
          selectedTicketId={state.ticketId}
          selectionDisabled={state.phase === "streaming"}
          onSelectTicket={selectTicket}
        />
        <DraftPanel
          state={state}
          onGenerate={() => void generateDraft()}
          onStop={stopGeneration}
          onEdit={editDraft}
          onApprove={approveDraft}
        />
      </div>
    </main>
  );
};
