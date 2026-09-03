import { getTicket, tickets } from "shared";

export const resolvers = {
  Query: {
    tickets: () => tickets,
    ticket: (_parent: unknown, { id }: { id: string }) => getTicket(id),
  },
};
