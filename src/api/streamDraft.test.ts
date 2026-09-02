import type { DraftStreamEvent } from "shared";
import { describe, expect, it, vi } from "vitest";
import { streamDraft } from ".";

const encoder = new TextEncoder();

const createResponse = (...chunks: string[]) =>
  new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    }),
    { status: 200 },
  );

describe("streamDraft", () => {
  it("posts the request and reports events split across network chunks", async () => {
    const fetchDraftStream = vi
      .fn()
      .mockResolvedValue(
        createResponse(
          'event: delta\ndata: {"type":"delta","requestId":"request-1","text":"Hel',
          'lo"}\n\nevent: complete\ndata: {"type":"complete","requestId":"request-1"}\n\n',
        ),
      );
    const events: DraftStreamEvent[] = [];
    const controller = new AbortController();

    await streamDraft(
      {
        ticketId: "ticket-1",
        requestId: "request-1",
        signal: controller.signal,
        onEvent: (event) => events.push(event),
      },
      fetchDraftStream,
    );

    expect(fetchDraftStream).toHaveBeenCalledWith("/api/drafts/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: "ticket-1", requestId: "request-1" }),
      signal: controller.signal,
    });
    expect(events).toEqual([
      { type: "delta", requestId: "request-1", text: "Hello" },
      { type: "complete", requestId: "request-1" },
    ]);
  });

  it("rejects unsuccessful responses", async () => {
    const fetchDraftStream = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      streamDraft(
        {
          ticketId: "ticket-1",
          requestId: "request-1",
          signal: new AbortController().signal,
          onEvent: vi.fn(),
        },
        fetchDraftStream,
      ),
    ).rejects.toThrow("status 503");
  });

  it("rejects successful responses without a readable body", async () => {
    const fetchDraftStream = vi.fn().mockResolvedValue({ ok: true, body: null } as Response);

    await expect(
      streamDraft(
        {
          ticketId: "ticket-1",
          requestId: "request-1",
          signal: new AbortController().signal,
          onEvent: vi.fn(),
        },
        fetchDraftStream,
      ),
    ).rejects.toThrow("did not include a body");
  });
});
