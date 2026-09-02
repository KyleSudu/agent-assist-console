export type ServerConfig = {
  port: number;
  draftProvider: string;
  modelName?: string;
  modelApiKey?: string;
};

type Environment = Record<string, string | undefined>;

const readPort = (value: string | undefined): number => {
  const port = Number(value ?? 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
};

export const loadServerConfig = (environment: Environment = process.env): ServerConfig => {
  const draftProvider = environment.DRAFT_PROVIDER?.trim() || "fixture";
  const modelName = environment.MODEL_NAME?.trim() || undefined;
  const modelApiKey = environment.MODEL_API_KEY?.trim() || undefined;

  if (draftProvider !== "fixture" && !modelApiKey) {
    throw new Error("MODEL_API_KEY is required when a remote draft provider is selected");
  }

  if (draftProvider !== "fixture" && !modelName) {
    throw new Error("MODEL_NAME is required when a remote draft provider is selected");
  }

  return {
    port: readPort(environment.PORT),
    draftProvider,
    modelName,
    modelApiKey,
  };
};
