import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { DraftStreamEvent, GenerateDraftRequest } from "../shared/contracts";
import { getTicket } from "../shared/tickets";

const port = Number(process.env.PORT ?? 8787);

const fixtureReplies: Record<string, string> = {
  "billing-duplicate-charge":
    "Hi Maya, I understand why seeing two pending charges would be concerning. A reservation change can temporarily create a second authorization while the original one is released. Please allow up to seven business days for the earlier authorization to disappear, depending on your bank. If both charges settle, reply here and we will review them right away.",
  "technical-photo-upload":
    "Hi Jordan, thanks for sharing the browsers and file details you already tested. Please rename one image using only letters and numbers, then try uploading it in a private browser window. If it still remains on processing, reply with the approximate upload time so we can investigate the failed job. Your existing listing will remain available while we check this.",
  "account-login-code":
    "Hi Sam, I can help you start the secure account-recovery process. Because the sign-in code is going to an unavailable phone number, please use the account recovery link on the login screen and verify access through your saved email address. Do not send identity documents or security codes in this conversation. If recovery is unsuccessful, reply here and we will guide you to the next verification step.",
  "refund-cancellation":
    "Hi Priya, I am sorry the cancellation disrupted your plans. The refund has been released from our side, but card issuers can take several business days to post it to the original payment method. Please check the refund status in your trip details and allow up to ten business days from the issue date. If it is still missing after that date, reply here so we can trace it with the payment processor.",
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

  if (!isGenerateDraftRequest(body) || !getTicket(body.ticketId)) {
    response.writeHead(400).end("Unknown ticket or invalid request");
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  let closed = false;
  request.on("close", () => {
    closed = true;
  });

  sendEvent(response, { type: "start", requestId: body.requestId });

  const words = fixtureReplies[body.ticketId].split(/(\s+)/);
  for (let index = 0; index < words.length; index += 3) {
    if (closed) return;
    const text = words.slice(index, index + 3).join("");
    sendEvent(response, { type: "delta", requestId: body.requestId, text });
    await new Promise((resolve) => setTimeout(resolve, 90));
  }

  if (!closed) {
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
