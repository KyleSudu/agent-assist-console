import * as React from "react";
import type { Ticket } from "shared";
import { TicketDetails } from "../TicketDetails";
import { TicketSelector } from "../TicketSelector";

type TicketPanelProps = {
  tickets: readonly Ticket[];
  selectedTicket: Ticket;
  selectedTicketId: string;
  selectionDisabled: boolean;
  onSelectTicket: (ticketId: string) => void;
};

export const TicketPanel = ({
  tickets,
  selectedTicket,
  selectedTicketId,
  selectionDisabled,
  onSelectTicket,
}: TicketPanelProps) => (
  <section aria-labelledby="ticket-heading" className="panel">
    <TicketSelector
      tickets={tickets}
      selectedTicketId={selectedTicketId}
      disabled={selectionDisabled}
      onSelectTicket={onSelectTicket}
    />
    <TicketDetails ticket={selectedTicket} />
  </section>
);
