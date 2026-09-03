export const typeDefs = /* GraphQL */ `
  type Ticket {
    id: ID!
    customerName: String!
    subject: String!
    body: String!
  }

  type Query {
    tickets: [Ticket!]!
    ticket(id: ID!): Ticket
  }
`;
