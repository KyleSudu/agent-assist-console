import { describe, expect, it } from "vitest";
import { loadServerConfig } from "./config";

describe("loadServerConfig", () => {
  it("defaults to the fixture generator without requiring secrets", () => {
    expect(loadServerConfig({})).toEqual({
      port: 8787,
      draftProvider: "fixture",
      modelName: undefined,
      modelApiKey: undefined,
    });
  });

  it("requires an API key when a remote provider is selected", () => {
    expect(() => loadServerConfig({ DRAFT_PROVIDER: "anthropic" })).toThrow(
      "MODEL_API_KEY is required",
    );
  });

  it("requires a model name when a remote provider is selected", () => {
    expect(() =>
      loadServerConfig({ DRAFT_PROVIDER: "anthropic", MODEL_API_KEY: "test-key" }),
    ).toThrow("MODEL_NAME is required");
  });

  it("accepts provider-neutral model configuration", () => {
    expect(
      loadServerConfig({
        PORT: "9000",
        DRAFT_PROVIDER: "anthropic",
        MODEL_NAME: " model-name ",
        MODEL_API_KEY: " test-key ",
      }),
    ).toEqual({
      port: 9000,
      draftProvider: "anthropic",
      modelName: "model-name",
      modelApiKey: "test-key",
    });
  });

  it("rejects invalid ports", () => {
    expect(() => loadServerConfig({ PORT: "0" })).toThrow("PORT");
  });
});
