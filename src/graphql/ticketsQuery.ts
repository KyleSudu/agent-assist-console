import { gql, type TypedDocumentNode } from "@apollo/client";
import type { Ticket } from "shared";

export type TicketsQueryData = {
  tickets: Ticket[];
};

export const TICKETS_QUERY: TypedDocumentNode<TicketsQueryData> = gql`
  query Tickets {
    tickets {
      id
      customerName
      subject
      body
    }
  }
`;
