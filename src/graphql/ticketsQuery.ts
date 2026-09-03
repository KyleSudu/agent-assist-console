import { graphql } from "./generated";

export const TICKETS_QUERY = graphql(`
  query Tickets {
    tickets {
      id
      customerName
      subject
      body
    }
  }
`);
