import type { SupportReplyGenerator } from "./types";

export type SupportReplyGeneratorFactories = Record<string, () => SupportReplyGenerator>;

export const selectSupportReplyGenerator = (
  provider: string,
  factories: SupportReplyGeneratorFactories,
): SupportReplyGenerator => {
  const createGenerator = factories[provider];

  if (!createGenerator) {
    throw new Error(`Support reply provider "${provider}" is not available`);
  }

  return createGenerator();
};
