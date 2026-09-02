import { describe, expect, it, vi } from "vitest";
import { selectDraftGenerator, type DraftGenerator } from ".";

const generator: DraftGenerator = {
  generate: vi.fn(),
};

describe("selectDraftGenerator", () => {
  it("lazily creates the selected provider", () => {
    const createFixture = vi.fn(() => generator);
    const createRemote = vi.fn(() => generator);

    expect(
      selectDraftGenerator("fixture", {
        fixture: createFixture,
        remote: createRemote,
      }),
    ).toBe(generator);
    expect(createFixture).toHaveBeenCalledOnce();
    expect(createRemote).not.toHaveBeenCalled();
  });

  it("rejects providers that have not been registered", () => {
    expect(() => selectDraftGenerator("unknown", { fixture: () => generator })).toThrow(
      'Draft provider "unknown" is not available',
    );
  });
});
