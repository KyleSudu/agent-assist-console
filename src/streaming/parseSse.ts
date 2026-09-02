import type { DraftStreamEvent } from "../../shared/contracts";

export type SseParser = {
  push: (chunk: string) => DraftStreamEvent[];
  flush: () => DraftStreamEvent[];
};

const parseBlock = (block: string): DraftStreamEvent | null => {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data) return null;

  try {
    return JSON.parse(data) as DraftStreamEvent;
  } catch {
    return null;
  }
};

export const createSseParser = (): SseParser => {
  let buffer = "";

  return {
    push(chunk) {
      buffer += chunk.replaceAll("\r\n", "\n");
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      return blocks.map(parseBlock).filter((event): event is DraftStreamEvent => event !== null);
    },
    flush() {
      const event = parseBlock(buffer);
      buffer = "";
      return event ? [event] : [];
    },
  };
};
