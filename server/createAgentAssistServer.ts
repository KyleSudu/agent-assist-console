import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { SupportReplyGenerator } from "./supportReplies";
import { getTicket, type DraftStreamEvent, type GenerateDraftRequest } from "shared";

type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;

type AgentAssistServerOptions = {
  supportReplyGenerator: SupportReplyGenerator;
  graphqlHandler?: RequestHandler;
  reportError?: (error: unknown) => void;
};

const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const isGenerateDraftRequest = (value: unknown): value is GenerateDraftRequest => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.ticketId === "string" && typeof candidate.requestId === "string";
};

const canWrite = (response: ServerResponse, signal: AbortSignal) =>
  !signal.aborted && !response.destroyed && !response.writableEnded;

const sendEvent = (response: ServerResponse, event: DraftStreamEvent) => {
  response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
};

/**
 * Creates the Agent Assist HTTP server around an injected reply generator. It validates draft requests, streams typed SSE events, and aborts generation when the client disconnects.
 */
export const createAgentAssistServer = ({
  supportReplyGenerator,
  graphqlHandler,
  reportError = console.error,
}: AgentAssistServerOptions) => {
  const streamDraft = async (request: IncomingMessage, response: ServerResponse) => {
    let body: unknown;
    try {
      body = await readJson(request);
    } catch {
      response.writeHead(400).end("Invalid JSON");
      return;
    }

    if (!isGenerateDraftRequest(body)) {
      response.writeHead(400).end("Unknown ticket or invalid request");
      return;
    }

    const ticket = getTicket(body.ticketId);
    if (!ticket) {
      response.writeHead(400).end("Unknown ticket or invalid request");
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const controller = new AbortController();
    response.on("close", () => controller.abort());

    sendEvent(response, { type: "start", requestId: body.requestId });

    try {
      for await (const text of supportReplyGenerator.generate(ticket, {
        signal: controller.signal,
      })) {
        if (!canWrite(response, controller.signal)) return;
        sendEvent(response, { type: "delta", requestId: body.requestId, text });
      }

      if (canWrite(response, controller.signal)) {
        sendEvent(response, { type: "complete", requestId: body.requestId });
        response.end();
      }
    } catch (error) {
      if (!canWrite(response, controller.signal)) return;

      reportError(error);
      sendEvent(response, {
        type: "error",
        requestId: body.requestId,
        message: "The suggested reply could not be generated.",
      });
      response.end();
    }
  };

  return createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/api/health") {
      response.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
      return;
    }

    if (request.method === "POST" && request.url === "/api/drafts/stream") {
      await streamDraft(request, response);
      return;
    }

    if (request.url?.startsWith("/graphql") && graphqlHandler) {
      await graphqlHandler(request, response);
      return;
    }

    response.writeHead(404).end("Not found");
  });
};
