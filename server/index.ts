import "dotenv/config";
import { loadServerConfig } from "./config";
import { createAgentAssistServer } from "./createAgentAssistServer";
import { createConfiguredSupportReplyGenerator } from "./generation";

const config = loadServerConfig();
const supportReplyGenerator = createConfiguredSupportReplyGenerator(config);
const server = createAgentAssistServer({ supportReplyGenerator });

server.listen(config.port, "127.0.0.1", () => {
  console.log(`Agent Assist API listening on http://localhost:${config.port}`);
});
