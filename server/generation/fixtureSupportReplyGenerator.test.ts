import { tickets } from "shared";
import { describe, expect, it } from "vitest";
import { createFixtureSupportReplyGenerator } from ".";

describe("createFixtureSupportReplyGenerator", () => {
  it("yields a deterministic reply as incremental text", async () => {
    const generator = createFixtureSupportReplyGenerator({ delayMs: 0 });
    const chunks: string[] = [];

    for await (const chunk of generator.generate(tickets[0], {
      signal: new AbortController().signal,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toContain("Hi Maya");
    expect(chunks.join("")).toContain("two pending charges");
  });

  it("stops yielding text after cancellation", async () => {
    const generator = createFixtureSupportReplyGenerator({ delayMs: 0 });
    const controller = new AbortController();
    const chunks: string[] = [];

    for await (const chunk of generator.generate(tickets[0], { signal: controller.signal })) {
      chunks.push(chunk);
      controller.abort();
    }

    expect(chunks).toHaveLength(1);
  });
});
