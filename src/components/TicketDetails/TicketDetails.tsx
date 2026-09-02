import * as React from "react";
import type { Ticket } from "shared";

type TicketDetailsProps = {
  ticket: Ticket;
};

export const TicketDetails = ({ ticket }: TicketDetailsProps) => (
  <article className="ticket">
    <p className="ticket-customer">From {ticket.customerName}</p>
    <h3>{ticket.subject}</h3>
    <p>{ticket.body}</p>
  </article>
);
