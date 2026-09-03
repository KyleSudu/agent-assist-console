import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createDraftStreamHandler } from "./draftStream";
import type { SupportReplyGenerator } from "./supportReplies";

type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;

type AgentAssistServerOptions = {
  supportReplyGenerator: SupportReplyGenerator;
  graphqlHandler?: RequestHandler;
  reportError?: (error: unknown) => void;
};

/** Creates the Node HTTP server and routes requests to the appropriate capability handler. */
export const createAgentAssistServer = ({
  supportReplyGenerator,
  graphqlHandler,
  reportError,
}: AgentAssistServerOptions) => {
  const draftStreamHandler = createDraftStreamHandler({
    supportReplyGenerator,
    reportError,
  });

  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/api/health") {
      response.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
      return;
    }

    if (request.method === "POST" && request.url === "/api/drafts/stream") {
      await draftStreamHandler(request, response);
      return;
    }

    if (request.url?.startsWith("/graphql") && graphqlHandler) {
      await graphqlHandler(request, response);
      return;
    }

    response.writeHead(404).end("Not found");
  });
};
