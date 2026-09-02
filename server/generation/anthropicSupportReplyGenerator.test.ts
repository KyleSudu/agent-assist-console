import { tickets } from "shared";
import { describe, expect, it, vi } from "vitest";
import { createAnthropicSupportReplyGenerator, type RequestAnthropicStream } from ".";

const createEvents = async function* () {
  yield { type: "message_start" };
  yield {
    type: "content_block_delta",
    delta: { type: "text_delta", text: "Hello " },
  };
  yield {
    type: "content_block_delta",
    delta: { type: "input_json_delta", partial_json: "{}" },
  };
  yield {
    type: "content_block_delta",
    delta: { type: "text_delta", text: "there." },
  };
  yield { type: "message_stop" };
};

describe("createAnthropicSupportReplyGenerator", () => {
  it("translates the generic prompt into an Anthropic streaming request", async () => {
    const requestStream = vi.fn<RequestAnthropicStream>().mockResolvedValue(createEvents());
    const controller = new AbortController();
    const generator = createAnthropicSupportReplyGenerator({
      apiKey: "test-key",
      model: "test-model",
      maxTokens: 300,
      requestStream,
    });
    const chunks: string[] = [];

    for await (const chunk of generator.generate(tickets[0], { signal: controller.signal })) {
      chunks.push(chunk);
    }

    expect(requestStream).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        max_tokens: 300,
        system: expect.stringContaining("customer-support reply"),
        messages: [
          {
            role: "user",
            content: expect.stringContaining(tickets[0].body),
          },
        ],
      }),
      controller.signal,
    );
    expect(chunks).toEqual(["Hello ", "there."]);
  });

  it("propagates provider errors to the streaming route", async () => {
    const requestStream = vi
      .fn<RequestAnthropicStream>()
      .mockRejectedValue(new Error("Provider unavailable"));
    const generator = createAnthropicSupportReplyGenerator({
      apiKey: "test-key",
      model: "test-model",
      requestStream,
    });
    const iterator = generator
      .generate(tickets[0], { signal: new AbortController().signal })
      [Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toThrow("Provider unavailable");
  });
});
