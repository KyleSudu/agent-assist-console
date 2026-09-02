import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { getTicket, type DraftStreamEvent, type GenerateDraftRequest } from "shared";
import { loadServerConfig } from "./config";
import { createConfiguredSupportReplyGenerator } from "./generation";

const config = loadServerConfig();
const port = config.port;

const supportReplyGenerator = createConfiguredSupportReplyGenerator(config);

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

const sendEvent = (response: ServerResponse, event: DraftStreamEvent) => {
  response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
};

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

  for await (const text of supportReplyGenerator.generate(ticket, { signal: controller.signal })) {
    sendEvent(response, { type: "delta", requestId: body.requestId, text });
  }

  if (!controller.signal.aborted) {
    sendEvent(response, { type: "complete", requestId: body.requestId });
    response.end();
  }
};

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/health") {
    response.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
    return;
  }

  if (request.method === "POST" && request.url === "/api/drafts/stream") {
    await streamDraft(request, response);
    return;
  }

  response.writeHead(404).end("Not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Agent Assist API listening on http://localhost:${port}`);
});
