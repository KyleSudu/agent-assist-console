import type { StreamingTextModel } from "../models";
import { buildDraftPrompt } from "./buildDraftPrompt";
import type { SupportReplyGenerator } from "./types";

export const createModelSupportReplyGenerator = (
  model: StreamingTextModel,
): SupportReplyGenerator => ({
  generate(ticket, options) {
    return model.stream(buildDraftPrompt(ticket), options);
  },
});
