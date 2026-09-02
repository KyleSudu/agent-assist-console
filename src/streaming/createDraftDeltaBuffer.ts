export type BufferedDraftDelta = {
  requestId: string;
  text: string;
};

export type DraftDeltaBuffer = {
  push: (delta: BufferedDraftDelta) => void;
  flush: () => void;
  clear: () => void;
};

type DraftDeltaBufferOptions = {
  onFlush: (delta: BufferedDraftDelta) => void;
  flushDelayMs?: number;
};

const findLastSentenceBoundary = (text: string): number => {
  let boundary = 0;

  for (const match of text.matchAll(/[.!?](?=\s|$)/g)) {
    boundary = match.index + 1;
  }

  return boundary;
};

/**
 * Buffers streamed text until a sentence boundary or maximum delay is reached. Clearing the buffer drops pending text and cancels its scheduled flush.
 */
export const createDraftDeltaBuffer = ({
  onFlush,
  flushDelayMs = 1_000,
}: DraftDeltaBufferOptions): DraftDeltaBuffer => {
  let pending: BufferedDraftDelta | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelScheduledFlush = () => {
    if (flushTimer === null) return;
    clearTimeout(flushTimer);
    flushTimer = null;
  };

  const flush = () => {
    cancelScheduledFlush();
    if (!pending) return;

    const delta = pending;
    pending = null;
    onFlush(delta);
  };

  const scheduleFlush = () => {
    if (flushTimer !== null || !pending?.text.trim()) return;
    flushTimer = setTimeout(flush, flushDelayMs);
  };

  const clear = () => {
    cancelScheduledFlush();
    pending = null;
  };

  const push = (delta: BufferedDraftDelta) => {
    if (pending && pending.requestId !== delta.requestId) clear();

    pending = {
      requestId: delta.requestId,
      text: (pending?.text ?? "") + delta.text,
    };

    const boundary = findLastSentenceBoundary(pending.text);
    if (boundary === 0) {
      scheduleFlush();
      return;
    }

    const completedText = pending.text.slice(0, boundary);
    const remainingText = pending.text.slice(boundary);
    const requestId = pending.requestId;
    cancelScheduledFlush();
    pending = remainingText ? { requestId, text: remainingText } : null;
    onFlush({ requestId, text: completedText });
    scheduleFlush();
  };

  return { push, flush, clear };
};
