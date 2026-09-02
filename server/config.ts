export type DraftGeneratorMode = "fixture" | "anthropic";

export type ServerConfig = {
  port: number;
  draftGeneratorMode: DraftGeneratorMode;
  anthropicApiKey?: string;
};

type Environment = Record<string, string | undefined>;

const readPort = (value: string | undefined): number => {
  const port = Number(value ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
};

const readDraftGeneratorMode = (value: string | undefined): DraftGeneratorMode => {
  const mode = value ?? "fixture";
  if (mode !== "fixture" && mode !== "anthropic") {
    throw new Error('DRAFT_GENERATOR must be either "fixture" or "anthropic"');
  }
  return mode;
};

export const loadServerConfig = (environment: Environment = process.env): ServerConfig => {
  const draftGeneratorMode = readDraftGeneratorMode(environment.DRAFT_GENERATOR);
  const anthropicApiKey = environment.ANTHROPIC_API_KEY?.trim() || undefined;

  if (draftGeneratorMode === "anthropic" && !anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required when DRAFT_GENERATOR=anthropic");
  }

  return {
    port: readPort(environment.PORT),
    draftGeneratorMode,
    anthropicApiKey,
  };
};
