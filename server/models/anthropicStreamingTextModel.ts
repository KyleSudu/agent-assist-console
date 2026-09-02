import Anthropic from "@anthropic-ai/sdk";
import type { StreamingTextModel } from "./types";

type AnthropicDraftRequest = {
  model: string;
  max_tokens: number;
  system: string;
  messages: [{ role: "user"; content: string }];
};

type AnthropicStreamEvent = {
  type: string;
  delta?: unknown;
};

export type RequestAnthropicStream = (
  request: AnthropicDraftRequest,
  signal: AbortSignal,
) => Promise<AsyncIterable<AnthropicStreamEvent>>;

type AnthropicStreamingTextModelOptions = {
  apiKey: string;
  model: string;
  maxTokens?: number;
  requestStream?: RequestAnthropicStream;
};

const createRequestStream = (apiKey: string): RequestAnthropicStream => {
  const client = new Anthropic({ apiKey });

  return async (request, signal) =>
    client.messages.create({ ...request, stream: true }, { signal });
};

const isTextDelta = (
  event: AnthropicStreamEvent,
): event is AnthropicStreamEvent & { delta: { type: "text_delta"; text: string } } =>
  event.type === "content_block_delta" &&
  typeof event.delta === "object" &&
  event.delta !== null &&
  "type" in event.delta &&
  event.delta.type === "text_delta" &&
  "text" in event.delta &&
  typeof event.delta.text === "string";

export const createAnthropicStreamingTextModel = ({
  apiKey,
  model,
  maxTokens = 500,
  requestStream = createRequestStream(apiKey),
}: AnthropicStreamingTextModelOptions): StreamingTextModel => ({
  async *stream(prompt, { signal }) {
    const stream = await requestStream(
      {
        model,
        max_tokens: maxTokens,
        system: prompt.instructions,
        messages: [{ role: "user", content: prompt.input }],
      },
      signal,
    );

    for await (const event of stream) {
      if (isTextDelta(event)) yield event.delta.text;
    }
  },
});
