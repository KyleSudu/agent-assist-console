import "dotenv/config";
import { loadServerConfig } from "./config";
import { createAgentAssistServer } from "./AgentAssistServer";
import { createGraphQLHandler } from "./graphql";
import { createConfiguredSupportReplyGenerator } from "./supportReplies";

const config = loadServerConfig();
const supportReplyGenerator = createConfiguredSupportReplyGenerator(config);
const graphqlHandler = createGraphQLHandler();

const server = createAgentAssistServer({ supportReplyGenerator, graphqlHandler });

server.listen(config.port, "127.0.0.1", () => {
  console.log(`Agent Assist API listening on http://localhost:${config.port}`);
});
