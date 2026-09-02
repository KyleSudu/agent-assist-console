import type { DraftStreamEvent, GenerateDraftRequest } from "shared";
import { createSseParser } from "streaming";

type StreamDraftOptions = GenerateDraftRequest & {
  signal: AbortSignal;
  onEvent: (event: DraftStreamEvent) => void;
};

type FetchDraftStream = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const streamDraft = async (
  { ticketId, requestId, signal, onEvent }: StreamDraftOptions,
  fetchDraftStream: FetchDraftStream = fetch,
): Promise<void> => {
  const response = await fetchDraftStream("/api/drafts/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId, requestId }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Draft stream request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Draft stream response did not include a body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true })).forEach(onEvent);
  }

  parser.push(decoder.decode()).forEach(onEvent);
  parser.flush().forEach(onEvent);
};
