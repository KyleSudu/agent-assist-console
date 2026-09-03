import { createSchema, createYoga } from "graphql-yoga";
import { resolvers } from "./resolvers";
import { typeDefs } from "./schema";

/**
 * Express/Fastify → general-purpose HTTP server framework
 * GraphQL Yoga → GraphQL-focused server framework
 * Apollo Client → frontend GraphQL request and caching library
 */
export const createGraphQLHandler = () =>
  createYoga({
    graphqlEndpoint: "/graphql",
    schema: createSchema({
      typeDefs,
      resolvers,
    }),
  });
