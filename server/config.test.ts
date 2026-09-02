import { describe, expect, it } from "vitest";
import { loadServerConfig } from "./config";

describe("loadServerConfig", () => {
  it("defaults to the fixture generator without requiring secrets", () => {
    expect(loadServerConfig({})).toEqual({
      port: 8787,
      draftGeneratorMode: "fixture",
      anthropicApiKey: undefined,
    });
  });

  it("requires an API key when Anthropic generation is selected", () => {
    expect(() => loadServerConfig({ DRAFT_GENERATOR: "anthropic" })).toThrow(
      "ANTHROPIC_API_KEY is required",
    );
  });

  it("accepts explicit Anthropic configuration", () => {
    expect(
      loadServerConfig({
        PORT: "9000",
        DRAFT_GENERATOR: "anthropic",
        ANTHROPIC_API_KEY: " test-key ",
      }),
    ).toEqual({
      port: 9000,
      draftGeneratorMode: "anthropic",
      anthropicApiKey: "test-key",
    });
  });

  it("rejects unknown generator modes and invalid ports", () => {
    expect(() => loadServerConfig({ DRAFT_GENERATOR: "automatic" })).toThrow("DRAFT_GENERATOR");
    expect(() => loadServerConfig({ PORT: "0" })).toThrow("PORT");
  });
});
