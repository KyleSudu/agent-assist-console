export type Ticket = {
  id: string;
  subject: string;
  body: string;
  customerName: string;
};

export type DraftStreamEvent =
  | { type: "start"; requestId: string }
  | { type: "delta"; requestId: string; text: string }
  | { type: "complete"; requestId: string }
  | { type: "error"; requestId: string; message: string };

export type GenerateDraftRequest = {
  ticketId: string;
  requestId: string;
};
