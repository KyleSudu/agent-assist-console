import type { StreamingTextModel } from "../models";
import { tickets } from "shared";
import { describe, expect, it, vi } from "vitest";
import { createModelSupportReplyGenerator } from ".";

const streamChunks = async function* () {
  yield "Generated ";
  yield "reply.";
};

describe("createModelSupportReplyGenerator", () => {
  it("builds a support prompt and delegates text generation to the model", async () => {
    const model: StreamingTextModel = {
      stream: vi.fn(() => streamChunks()),
    };
    const generator = createModelSupportReplyGenerator(model);
    const controller = new AbortController();
    const chunks: string[] = [];

    for await (const chunk of generator.generate(tickets[0], { signal: controller.signal })) {
      chunks.push(chunk);
    }

    expect(model.stream).toHaveBeenCalledWith(
      {
        instructions: expect.stringContaining("customer-support reply"),
        input: expect.stringContaining(tickets[0].body),
      },
      { signal: controller.signal },
    );
    expect(chunks).toEqual(["Generated ", "reply."]);
  });
});
