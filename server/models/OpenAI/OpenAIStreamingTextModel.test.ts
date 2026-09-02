import { describe, expect, it, vi } from "vitest";
import { createOpenAIStreamingTextModel, type RequestOpenAIStream } from ".";

const prompt = {
  instructions: "Draft a customer-support reply.",
  input: "Customer ticket content",
};

const createEvents = async function* () {
  yield { type: "response.created" };
  yield { type: "response.output_text.delta", delta: "Hello " };
  yield { type: "response.output_item.added", delta: { ignored: true } };
  yield { type: "response.output_text.delta", delta: "there." };
  yield { type: "response.completed" };
};

describe("createOpenAIStreamingTextModel", () => {
  it("translates the generic prompt into an OpenAI streaming request", async () => {
    const requestStream = vi.fn<RequestOpenAIStream>().mockResolvedValue(createEvents());
    const controller = new AbortController();
    const model = createOpenAIStreamingTextModel({
      apiKey: "test-key",
      model: "test-model",
      maxOutputTokens: 300,
      requestStream,
    });
    const chunks: string[] = [];

    for await (const chunk of model.stream(prompt, { signal: controller.signal })) {
      chunks.push(chunk);
    }

    expect(requestStream).toHaveBeenCalledWith(
      {
        model: "test-model",
        instructions: prompt.instructions,
        input: prompt.input,
        max_output_tokens: 300,
        stream: true,
        store: false,
      },
      controller.signal,
    );
    expect(chunks).toEqual(["Hello ", "there."]);
  });

  it("propagates provider errors to the streaming route", async () => {
    const requestStream = vi
      .fn<RequestOpenAIStream>()
      .mockRejectedValue(new Error("Provider unavailable"));
    const model = createOpenAIStreamingTextModel({
      apiKey: "test-key",
      model: "test-model",
      requestStream,
    });
    const iterator = model
      .stream(prompt, { signal: new AbortController().signal })
      [Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toThrow("Provider unavailable");
  });
});
