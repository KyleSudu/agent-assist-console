import type { DraftGenerator } from "./types";

export type DraftGeneratorFactories = Record<string, () => DraftGenerator>;

export const selectDraftGenerator = (
  provider: string,
  factories: DraftGeneratorFactories,
): DraftGenerator => {
  const createGenerator = factories[provider];

  if (!createGenerator) {
    throw new Error(`Draft provider "${provider}" is not available`);
  }

  return createGenerator();
};
