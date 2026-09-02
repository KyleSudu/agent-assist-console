import type { Ticket } from "shared";

export type GenerateReplyOptions = {
  signal: AbortSignal;
};

export interface SupportReplyGenerator {
  generate(ticket: Ticket, options: GenerateReplyOptions): AsyncIterable<string>;
}
