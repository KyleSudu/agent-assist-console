import { describe, expect, it, vi } from "vitest";
import { selectSupportReplyGenerator, type SupportReplyGenerator } from ".";

const generator: SupportReplyGenerator = {
  generate: vi.fn(),
};

describe("selectSupportReplyGenerator", () => {
  it("lazily creates the selected provider", () => {
    const createFixture = vi.fn(() => generator);
    const createRemote = vi.fn(() => generator);

    expect(
      selectSupportReplyGenerator("fixture", {
        fixture: createFixture,
        remote: createRemote,
      }),
    ).toBe(generator);
    expect(createFixture).toHaveBeenCalledOnce();
    expect(createRemote).not.toHaveBeenCalled();
  });

  it("rejects providers that have not been registered", () => {
    expect(() => selectSupportReplyGenerator("unknown", { fixture: () => generator })).toThrow(
      'Support reply provider "unknown" is not available',
    );
  });
});
