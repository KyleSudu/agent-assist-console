import { describe, expect, it } from "vitest";
import { createSseParser } from "./parseSse";

describe("createSseParser", () => {
  it("parses events split across network chunks", () => {
    const parser = createSseParser();

    expect(parser.push('event: delta\ndata: {"type":"del')).toEqual([]);
    expect(parser.push('ta","requestId":"1","text":"Hello"}\n\n')).toEqual([
      { type: "delta", requestId: "1", text: "Hello" },
    ]);
  });

  it("ignores malformed data", () => {
    const parser = createSseParser();
    expect(parser.push("event: delta\ndata: not-json\n\n")).toEqual([]);
  });
});
