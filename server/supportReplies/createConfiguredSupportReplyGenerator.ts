import type { ServerConfig } from "../config";
import {
  createAnthropicStreamingTextModel,
  createOpenAIStreamingTextModel,
  type StreamingTextModel,
} from "../models";
import { createFixtureSupportReplyGenerator } from "./Fixture";
import { createModelSupportReplyGenerator } from "./modelSupportReplyGenerator";
import { selectSupportReplyGenerator } from "./selectSupportReplyGenerator";
import type { SupportReplyGenerator } from "./types";

type Dependencies = {
  createAnthropicModel?: (options: { apiKey: string; model: string }) => StreamingTextModel;
  createOpenAIModel?: (options: { apiKey: string; model: string }) => StreamingTextModel;
};

const requireRemoteModelConfig = (config: ServerConfig) => {
  if (!config.modelApiKey || !config.modelName) {
    throw new Error("Remote model configuration is incomplete");
  }

  return { apiKey: config.modelApiKey, model: config.modelName };
};

/**
 * Composes the configured support-reply implementation from provider-neutral domain logic and a selected runtime adapter. Provider factories are lazy, so unused SDK clients are never initialized.
 */
export const createConfiguredSupportReplyGenerator = (
  config: ServerConfig,
  {
    createAnthropicModel = createAnthropicStreamingTextModel,
    createOpenAIModel = createOpenAIStreamingTextModel,
  }: Dependencies = {},
): SupportReplyGenerator =>
  selectSupportReplyGenerator(config.draftProvider, {
    fixture: createFixtureSupportReplyGenerator,
    anthropic: () =>
      createModelSupportReplyGenerator(createAnthropicModel(requireRemoteModelConfig(config))),
    openai: () =>
      createModelSupportReplyGenerator(createOpenAIModel(requireRemoteModelConfig(config))),
  });
