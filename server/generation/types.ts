import type { Ticket } from "shared";

export type GenerateDraftOptions = {
  signal: AbortSignal;
};

export type DraftGenerator = {
  generate: (ticket: Ticket, options: GenerateDraftOptions) => AsyncIterable<string>;
};
