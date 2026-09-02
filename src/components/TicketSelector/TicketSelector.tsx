import * as React from "react";
import type { Ticket } from "shared";
import { TicketOptions } from "../TicketOptions";

type TicketSelectorProps = {
  tickets: readonly Ticket[];
  selectedTicketId: string;
  disabled: boolean;
  onSelectTicket: (ticketId: string) => void;
};

export const TicketSelector = ({
  tickets,
  selectedTicketId,
  disabled,
  onSelectTicket,
}: TicketSelectorProps) => (
  <>
    <h2 id="ticket-heading">Customer ticket</h2>
    <label htmlFor="ticket-select">Select a synthetic ticket</label>
    <select
      id="ticket-select"
      value={selectedTicketId}
      disabled={disabled}
      onChange={(event) => onSelectTicket(event.target.value)}
    >
      <TicketOptions tickets={tickets} />
    </select>
  </>
);
