import OpenAI from "openai";
import type { StreamingTextModel } from "../types";

type OpenAITextRequest = {
  model: string;
  instructions: string;
  input: string;
  max_output_tokens: number;
  stream: true;
  store: false;
};

type OpenAIStreamEvent = {
  type: string;
  delta?: unknown;
};

export type RequestOpenAIStream = (
  request: OpenAITextRequest,
  signal: AbortSignal,
) => Promise<AsyncIterable<OpenAIStreamEvent>>;

type OpenAIStreamingTextModelOptions = {
  apiKey: string;
  model: string;
  maxOutputTokens?: number;
  requestStream?: RequestOpenAIStream;
};

const createRequestStream = (apiKey: string): RequestOpenAIStream => {
  const client = new OpenAI({ apiKey });

  return async (request, signal) => client.responses.create(request, { signal });
};

const isTextDelta = (event: OpenAIStreamEvent): event is OpenAIStreamEvent & { delta: string } =>
  event.type === "response.output_text.delta" && typeof event.delta === "string";

export const createOpenAIStreamingTextModel = ({
  apiKey,
  model,
  maxOutputTokens = 500,
  requestStream = createRequestStream(apiKey),
}: OpenAIStreamingTextModelOptions): StreamingTextModel => ({
  async *stream(prompt, { signal }) {
    const stream = await requestStream(
      {
        model,
        instructions: prompt.instructions,
        input: prompt.input,
        max_output_tokens: maxOutputTokens,
        stream: true,
        store: false,
      },
      signal,
    );

    for await (const event of stream) {
      if (isTextDelta(event)) yield event.delta;
    }
  },
});
