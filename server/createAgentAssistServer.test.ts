import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { SupportReplyGenerator } from "./supportReplies";
import { createSseParser } from "streaming";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentAssistServer } from "./createAgentAssistServer";

const servers: Server[] = [];

const startServer = async (supportReplyGenerator: SupportReplyGenerator, reportError = vi.fn()) => {
  const server = createAgentAssistServer({ supportReplyGenerator, reportError });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, reportError };
};

const parseEvents = (body: string) => {
  const parser = createSseParser();
  return [...parser.push(body), ...parser.flush()];
};

const postDraft = (url: string, signal?: AbortSignal) =>
  fetch(`${url}/api/drafts/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticketId: "billing-duplicate-charge",
      requestId: "request-1",
    }),
    signal,
  });

const createFailingStream = (error: Error): AsyncIterable<string> => ({
  [Symbol.asyncIterator]() {
    return {
      next: () => Promise.reject(error),
    };
  },
});

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
});

describe("createAgentAssistServer", () => {
  it("streams a sanitized error when generation fails before text", async () => {
    const providerError = new Error("secret provider detail");
    const generator: SupportReplyGenerator = {
      generate: () => createFailingStream(providerError),
    };
    const { url, reportError } = await startServer(generator);

    const response = await postDraft(url);
    const responseBody = await response.text();
    const events = parseEvents(responseBody);

    expect(events).toEqual([
      { type: "start", requestId: "request-1" },
      {
        type: "error",
        requestId: "request-1",
        message: "The suggested reply could not be generated.",
      },
    ]);
    expect(responseBody).not.toContain(providerError.message);
    expect(reportError).toHaveBeenCalledWith(providerError);
  });

  it("retains streamed text and ends with an error after a partial failure", async () => {
    const generator: SupportReplyGenerator = {
      async *generate() {
        yield "Partial reply";
        throw new Error("Stream interrupted");
      },
    };
    const { url } = await startServer(generator);

    const response = await postDraft(url);
    const events = parseEvents(await response.text());

    expect(events.map((event) => event.type)).toEqual(["start", "delta", "error"]);
    expect(events).toContainEqual({
      type: "delta",
      requestId: "request-1",
      text: "Partial reply",
    });
  });

  it("aborts generation when the client disconnects", async () => {
    let confirmAbort: () => void = () => undefined;
    const abortObserved = new Promise<void>((resolve) => {
      confirmAbort = resolve;
    });
    const generator: SupportReplyGenerator = {
      async *generate(_ticket, { signal }) {
        yield "Partial reply";
        await new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => {
            confirmAbort();
            resolve();
          });
        });
      },
    };
    const { url, reportError } = await startServer(generator);
    const controller = new AbortController();
    const response = await postDraft(url, controller.signal);
    const reader = response.body?.getReader();

    await reader?.read();
    controller.abort();
    await abortObserved;

    expect(reportError).not.toHaveBeenCalled();
  });
});
