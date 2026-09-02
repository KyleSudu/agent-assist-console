import type { ServerConfig } from "../config";
import type { StreamingTextModel } from "../models";
import { tickets } from "shared";
import { describe, expect, it, vi } from "vitest";
import { createConfiguredSupportReplyGenerator } from ".";

const remoteConfig: ServerConfig = {
  port: 8787,
  draftProvider: "anthropic",
  modelName: "test-model",
  modelApiKey: "test-key",
};

const streamChunks = async function* () {
  yield "Remote reply.";
};

describe("createConfiguredSupportReplyGenerator", () => {
  it("keeps fixture mode independent of remote model setup", async () => {
    const createAnthropicModel = vi.fn();
    const generator = createConfiguredSupportReplyGenerator(
      {
        port: 8787,
        draftProvider: "fixture",
      },
      { createAnthropicModel },
    );

    const chunks: string[] = [];
    for await (const chunk of generator.generate(tickets[0], {
      signal: new AbortController().signal,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toContain("Hi Maya");
    expect(createAnthropicModel).not.toHaveBeenCalled();
  });

  it("composes the Anthropic model with support reply generation", async () => {
    const model: StreamingTextModel = {
      stream: vi.fn(() => streamChunks()),
    };
    const createAnthropicModel = vi.fn(() => model);
    const generator = createConfiguredSupportReplyGenerator(remoteConfig, {
      createAnthropicModel,
    });

    const chunks: string[] = [];
    for await (const chunk of generator.generate(tickets[0], {
      signal: new AbortController().signal,
    })) {
      chunks.push(chunk);
    }

    expect(createAnthropicModel).toHaveBeenCalledWith({
      apiKey: "test-key",
      model: "test-model",
    });
    expect(model.stream).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.stringContaining(tickets[0].body) }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(chunks).toEqual(["Remote reply."]);
  });
});
