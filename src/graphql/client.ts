import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

/**
 * Apollo Client sends frontend GraphQL operations to GraphQL Yoga and caches the returned application data.
 */
export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: "/graphql",
  }),
  cache: new InMemoryCache(),
});
