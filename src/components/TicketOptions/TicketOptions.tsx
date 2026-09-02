import type { Ticket } from "shared";

type TicketOptionsProps = {
  tickets: readonly Ticket[];
};

export const TicketOptions = ({ tickets }: TicketOptionsProps) =>
  tickets.map((ticket) => (
    <option key={ticket.id} value={ticket.id}>
      {ticket.subject}
    </option>
  ));
