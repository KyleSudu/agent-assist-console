import type { Ticket } from "./contracts";

export const tickets = [
  {
    id: "billing-duplicate-charge",
    customerName: "Maya Chen",
    subject: "Duplicate charge after changing reservation",
    body: "I changed the dates on my reservation yesterday and now see two pending charges. Can you confirm whether I was charged twice?",
  },
  {
    id: "technical-photo-upload",
    customerName: "Jordan Reed",
    subject: "Listing photos will not finish uploading",
    body: "Three new listing photos remain stuck on processing in both Firefox and Safari. The files are JPEGs under 5 MB.",
  },
  {
    id: "account-login-code",
    customerName: "Sam Rivera",
    subject: "Login code sent to an old number",
    body: "My sign-in code goes to a phone number I no longer have. I can still access the email address on my account.",
  },
  {
    id: "refund-cancellation",
    customerName: "Priya Shah",
    subject: "Refund timing for cancelled stay",
    body: "The host cancelled my stay four days ago. My account says the refund was issued, but it has not appeared on my card.",
  },
] as const satisfies readonly Ticket[];

export const getTicket = (ticketId: string): Ticket | undefined =>
  tickets.find((ticket) => ticket.id === ticketId);
