import type { Ticket } from "shared";
import type { SupportReplyGenerator } from "../types";

const fixtureReplies: Record<string, string> = {
  "billing-duplicate-charge":
    "Hi Maya, I understand why seeing two pending charges would be concerning. A reservation change can temporarily create a second authorization while the original one is released. Please allow up to seven business days for the earlier authorization to disappear, depending on your bank. If both charges settle, reply here and we will review them right away.",
  "technical-photo-upload":
    "Hi Jordan, thanks for sharing the browsers and file details you already tested. Please rename one image using only letters and numbers, then try uploading it in a private browser window. If it still remains on processing, reply with the approximate upload time so we can investigate the failed job. Your existing listing will remain available while we check this.",
  "account-login-code":
    "Hi Sam, I can help you start the secure account-recovery process. Because the sign-in code is going to an unavailable phone number, please use the account recovery link on the login screen and verify access through your saved email address. Do not send identity documents or security codes in this conversation. If recovery is unsuccessful, reply here and we will guide you to the next verification step.",
  "refund-cancellation":
    "Hi Priya, I am sorry the cancellation disrupted your plans. The refund has been released from our side, but card issuers can take several business days to post it to the original payment method. Please check the refund status in your trip details and allow up to ten business days from the issue date. If it is still missing after that date, reply here so we can trace it with the payment processor.",
};

type FixtureSupportReplyGeneratorOptions = {
  delayMs?: number;
};

const wait = (delayMs: number) =>
  delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve();

/**
 * Creates the deterministic, offline reply generator used for development and tests. It streams known synthetic replies without initializing or billing a remote model provider.
 */
export const createFixtureSupportReplyGenerator = ({
  delayMs = 90,
}: FixtureSupportReplyGeneratorOptions = {}): SupportReplyGenerator => ({
  async *generate(ticket: Ticket, { signal }) {
    const reply = fixtureReplies[ticket.id];
    if (!reply) throw new Error(`No fixture reply exists for ticket ${ticket.id}`);

    const words = reply.split(/(\s+)/);
    for (let index = 0; index < words.length; index += 3) {
      if (signal.aborted) return;
      yield words.slice(index, index + 3).join("");
      await wait(delayMs);
    }
  },
});
