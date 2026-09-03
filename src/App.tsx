import { useQuery } from "@apollo/client/react";
import * as React from "react";
import { DraftPanel, TicketPanel } from "components";
import { useDraftWorkspace } from "hooks";
import type { Ticket } from "shared";
import { TICKETS_QUERY } from "./graphql";
import "./styles.css";

type AgentAssistWorkspaceProps = {
  tickets: Ticket[];
};

const AgentAssistWorkspace = ({ tickets }: AgentAssistWorkspaceProps) => {
  const initialTicket = tickets[0];
  const { state, selectTicket, generateDraft, stopGeneration, editDraft, approveDraft } =
    useDraftWorkspace(initialTicket.id);
  const selectedTicket = tickets.find((ticket) => ticket.id === state.ticketId) ?? initialTicket;

  return (
    <div className="workspace">
      <TicketPanel
        tickets={tickets}
        selectedTicket={selectedTicket}
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
  );
};

export const App = () => {
  const { data, loading, error } = useQuery(TICKETS_QUERY);

  let content: React.ReactNode;

  if (loading) {
    content = <p role="status">Loading tickets…</p>;
  } else if (error) {
    content = <p role="alert">Tickets could not be loaded.</p>;
  } else if (!data?.tickets.length) {
    content = <p role="status">No tickets are available.</p>;
  } else {
    content = <AgentAssistWorkspace tickets={data.tickets} />;
  }

  return (
    <main className="shell">
      <header className="page-header">
        <p className="eyebrow">Support operations</p>
        <h1>Agent Assist Console</h1>
        <p>Review a suggested response before approving it for a synthetic support ticket.</p>
      </header>

      {content}
    </main>
  );
};
