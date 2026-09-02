# Agent Assist Console learning log

This is a running record of architectural decisions, implementation discoveries, and tradeoffs. It is intentionally more candid and detailed than the README so it can serve as source material for a future article.

## 2026-09-02 — Separating streaming transport from React state

### What prompted the change

The first vertical slice proved that a browser could receive an SSE-formatted response through `fetch`, update a draft incrementally, stop generation, and ignore stale events. However, one hook was responsible for too many kinds of work:

- Starting and cancelling requests
- Constructing the HTTP request
- Reading `ReadableStream` chunks
- Decoding bytes into text
- Parsing SSE events
- Translating those events into reducer actions
- Exposing all workspace state changes to the UI

That implementation worked, but the boundaries did not describe the system clearly. It would also make adding a real model harder because transport behavior and React behavior could only be tested together.

### The boundary introduced

The network and stream-reading behavior now lives behind one function:

```ts
await streamDraft({
  ticketId,
  requestId,
  signal,
  onEvent,
});
```

`streamDraft` owns the HTTP request, response validation, byte decoding, and SSE parsing. Its caller only needs to provide request data, cancellation, and an event callback.

This is a useful boundary because the upcoming server-side model integration does not need to change the React state model. As long as the server continues emitting the same `DraftStreamEvent` contract, the UI does not care whether the text came from a deterministic fixture or an LLM.

### Before and after in the hook

Before, the React hook knew transport details:

```ts
const response = await fetch("/api/drafts/stream", options);
const reader = response.body.getReader();
const decoder = new TextDecoder();
const parser = createSseParser();
```

After, the hook coordinates the user workflow:

```ts
await streamDraft({
  ticketId: state.ticketId,
  requestId,
  signal: controller.signal,
  onEvent: handleEvent,
});
```

The distinction is subtle but important: the API module answers “how do bytes become draft events?” while the hook answers “what should this workspace do when draft events arrive?”

### Hiding reducer mechanics from the UI

The original hook returned `dispatch`, which meant `App` needed to know action names such as `select-ticket`, `edit`, and `approve`. The renamed `useDraftWorkspace` hook now exposes intent-based operations:

```ts
const { state, selectTicket, generateDraft, stopGeneration, editDraft, approveDraft } =
  useDraftWorkspace();
```

This makes `App` a composition layer rather than another participant in the state machine. Reducer actions can now change without requiring component consumers to change with them.

### Making reducer initialization explicit

The reducer previously imported the synthetic ticket fixtures to select its initial ticket. That coupled reusable state logic to demo data. Initialization is now supplied from outside:

```ts
const [state, dispatch] = useReducer(draftReducer, tickets[0].id, createInitialDraftState);
```

The reducer owns the shape of its state, while the hook chooses which ticket should be initial. This is a small example of dependency inversion: policy and data are supplied at the boundary instead of imported deep inside the state module.

### How the tests changed

The tests now mirror the architectural boundaries:

- API tests provide controlled `ReadableStream` chunks and verify request construction, split-event handling, HTTP failures, and missing bodies.
- Hook tests replace `streamDraft` with a mock and focus on state transitions, cancellation, and the public hook API.
- Reducer tests construct their own initial state without importing application fixtures.

No test calls a real network service. The eventual LLM adapter will also be replaced at its boundary during automated tests.

### Tradeoffs and open questions

- `streamDraft` accepts an optional fetch implementation for direct unit testing. Dependency injection adds one argument, but avoids global fetch mocking and keeps tests explicit.
- The SSE parser currently treats successfully parsed JSON as a trusted `DraftStreamEvent`. Runtime validation is still needed before treating an external model-backed stream as hardened.
- The hook still owns an `AbortController`, which is intentional: cancellation represents a user/workspace lifecycle decision, while the API module merely honors the supplied signal.
- The deterministic server remains in place for this commit. The next change will put real model generation behind the existing server event contract.

### Verification

The completed refactor passed formatting, linting, strict TypeScript checking, all 22 automated tests, and the production build. The test suite increased from 17 to 22 tests because transport failures and the new public workspace API are now covered independently.

## 2026-09-02 — Preparing the server for a real model

### Step 1: Define the generator boundary

Before installing a model SDK, the deterministic implementation was moved behind a `DraftGenerator` contract:

```ts
type DraftGenerator = {
  generate: (ticket: Ticket, options: GenerateDraftOptions) => AsyncIterable<string>;
};
```

An `AsyncIterable<string>` is a useful representation for generation because the server can consume deterministic chunks and future model tokens with the same `for await...of` loop:

```ts
for await (const text of draftGenerator.generate(ticket, { signal })) {
  sendEvent(response, { type: "delta", requestId, text });
}
```

The HTTP route no longer knows where the text originates. Its responsibilities are limited to validating the request, translating generated text into the browser-facing event contract, and stopping work when the client disconnects.

The fixture generator remains the only implementation at this step. It accepts a configurable delay so the interface can stream realistically in the app and run instantly in unit tests.

Cancellation is represented by a standard `AbortSignal`. This matters for the next implementation because the same signal can be forwarded to an external model SDK rather than inventing a custom cancellation mechanism.

### Step 2: Separate secrets from runtime selection

The server now loads local values from `.env`, but possession of an API key does not automatically enable external model calls. Model selection is explicit:

```env
DRAFT_GENERATOR=fixture
ANTHROPIC_API_KEY=
```

This separates two concerns:

- `ANTHROPIC_API_KEY` answers whether the server has credentials.
- `DRAFT_GENERATOR` answers which implementation the developer intends to run.

Defaulting to `fixture` keeps local development and automated tests deterministic and free. Selecting `anthropic` without a key fails immediately during startup with a useful configuration error. Unknown modes and invalid ports are also rejected instead of being allowed to fail later in less obvious ways.

At this intermediate step, the server deliberately rejects `anthropic` mode even when a key is present because the adapter has not been connected yet. This prevents a misleading state where configuration claims to use a model but the server silently continues returning fixtures.
