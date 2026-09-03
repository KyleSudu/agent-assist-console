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

### Step 3: Make the harness provider-neutral

The first configuration used Anthropic-specific names. Before adding an SDK, that decision was revisited so the surrounding harness would not assume one vendor:

```env
DRAFT_PROVIDER=fixture
MODEL_NAME=
MODEL_API_KEY=
```

Provider selection now happens through a registry of lazy factories:

```ts
const draftGenerator = selectDraftGenerator(config.draftProvider, {
  fixture: createFixtureDraftGenerator,
});
```

When more adapters exist, they can be registered without changing the HTTP route or browser contract:

```ts
const draftGenerator = selectDraftGenerator(config.draftProvider, {
  fixture: createFixtureDraftGenerator,
  anthropic: createAnthropicDraftGenerator,
  openai: createOpenAIDraftGenerator,
});
```

Factories are lazy, so only the selected provider is initialized. This avoids requiring every provider's credentials and client setup during startup. Unknown providers fail directly rather than silently falling back to fixtures.

The provider interface is generic, but adapters are still allowed to use provider-specific SDKs internally. The goal is not to erase real differences between APIs; it is to contain those differences behind the `DraftGenerator` boundary.

## 2026-09-02 — Showing the interaction in the README

The README now includes a screenshot captured from the running local application while a reply is actively streaming. The streaming state was chosen instead of the initial empty state because it communicates the central interaction at a glance: partial model output is visible, approval is unavailable, ticket selection is locked, and a keyboard-focusable Stop action remains available.

The image uses only synthetic ticket and response content. Keeping the screenshot in `docs/images` makes it versioned with the UI it represents and allows GitHub to render it without relying on an external image host.

## 2026-09-02 — Building a provider-neutral prompt

Prompt construction now has its own provider-independent boundary:

```ts
type DraftPrompt = {
  instructions: string;
  input: string;
};
```

The distinction mirrors the roles supported by common model APIs. Stable application instructions describe the task and safety constraints, while the changing ticket content is passed separately as input. Each provider adapter will translate these two values into its own SDK request format.

The prompt explicitly labels ticket text as untrusted data. A customer could write something that resembles an instruction, such as “ignore your rules,” but that text should remain content to answer rather than behavior for the model to adopt.

Ticket fields are serialized as JSON instead of interpolated into a hand-built pseudo-format. JSON does not eliminate prompt injection, but it provides an unambiguous data boundary and correctly escapes quotes and newlines. The internal ticket ID is omitted because the model does not need it to draft the reply.

The instructions also prohibit invented account actions, policy claims, and guarantees. This is important in support tooling: a fluent but unsupported claim that a refund was issued can be more harmful than an obviously incomplete draft. The human approval step remains necessary even with these instructions.

## 2026-09-02 — Implementing the first remote-model adapter

The first remote adapter uses Anthropic's official TypeScript SDK, but the provider-specific code is contained in `createAnthropicDraftGenerator`. It implements the same `DraftGenerator` contract as the fixture adapter.

Anthropic's SDK offers a higher-level streaming helper and a lower-level `messages.create({ stream: true })` API. The lower-level API was selected because it returns an async iterable of events without accumulating a complete response, which maps closely to this project's existing streaming design. See the SDK's [streaming documentation](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md#streaming-responses).

The adapter translates the generic prompt into Anthropic's request shape:

```ts
{
  model,
  max_tokens: maxTokens,
  system: prompt.instructions,
  messages: [{ role: "user", content: prompt.input }],
}
```

Anthropic streams several event types for message and content-block lifecycle changes. The generic application does not need those details, so the adapter yields only `content_block_delta` events whose delta type is `text_delta`:

```ts
if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
  yield event.delta.text ?? "";
}
```

The SDK's event union revealed that not every event containing a `delta` gives that value the same shape. Instead of weakening the code with a type assertion, the adapter treats the provider delta as `unknown` and uses a runtime guard before reading text. This keeps provider assumptions localized and ensures non-text events cannot accidentally enter the application stream.

The adapter forwards the workspace's `AbortSignal` into the SDK request. Provider errors are allowed to propagate so the HTTP route can translate them into the application's existing error event instead of hiding failures inside the adapter.

Tests inject a fake `requestStream` function. This exercises prompt translation, text-event filtering, cancellation wiring, and error propagation without loading credentials, making network calls, or incurring model costs.

### Naming refinement: `SupportReplyGenerator`

After implementing the first adapter, the name `DraftGenerator` felt too mechanical and underspecified. The application is not generating arbitrary drafts; it has one domain capability—producing a proposed support reply. The shared contract was renamed accordingly:

```ts
interface SupportReplyGenerator {
  generate(ticket: Ticket, options: GenerateReplyOptions): AsyncIterable<string>;
}
```

An interface makes the intended implementation boundary visually explicit. The fixture and Anthropic factory functions both declare `SupportReplyGenerator` as their return type, so TypeScript verifies that they fulfill the same contract.

No base class is required. TypeScript uses structural typing, and these adapters do not share implementation state or behavior that would justify class inheritance. Factory-based composition keeps construction flexible while the interface supplies the compile-time guarantee:

```ts
createFixtureSupportReplyGenerator(): SupportReplyGenerator;
createAnthropicSupportReplyGenerator(options): SupportReplyGenerator;
```

The Anthropic SDK client does not inherit from `SupportReplyGenerator`; it has a different, provider-level responsibility. The Anthropic adapter wraps that client and translates between the SDK's event model and the application's domain contract.

### Finding the missing layer: domain service versus model adapter

The discussion about naming the interface `BaseModel` exposed a deeper issue. `SupportReplyGenerator` was domain-specific, but the Anthropic implementation was being treated as though it were also the domain service. That combined prompt construction with provider translation.

The responsibilities are now separated:

```text
SupportReplyGenerator
  -> converts a Ticket into a TextPrompt
  -> delegates streaming to a StreamingTextModel

StreamingTextModel
  -> accepts provider-neutral instructions and input
  -> streams generated text

AnthropicStreamingTextModel
  -> converts TextPrompt into an Anthropic request
  -> filters Anthropic events into text chunks
```

The model-level contract is:

```ts
interface StreamingTextModel {
  stream(prompt: TextPrompt, options: StreamTextOptions): AsyncIterable<string>;
}
```

`BaseModel` was considered but rejected because “base” commonly implies an abstract class with shared implementation inherited by subclasses. These adapters share behavior, but not implementation or state. `StreamingTextModel` names the exact capability required by the application and allows either classes or factory-created objects to satisfy it through TypeScript's structural typing.

The model-backed domain service is composed rather than inherited:

```ts
const createModelSupportReplyGenerator = (model: StreamingTextModel): SupportReplyGenerator => ({
  generate(ticket, options) {
    return model.stream(buildDraftPrompt(ticket), options);
  },
});
```

This creates two useful axes of change. Support prompt behavior can evolve without editing provider adapters, and model providers can be swapped without editing ticket-to-prompt logic.

The fixture implementation intentionally remains a direct `SupportReplyGenerator`. It replaces the complete remote generation path with known ticket-specific replies, which is more useful for deterministic UI development than pretending to be a general-purpose language model.

## 2026-09-02 — Connecting configuration through composition

The provider setting now selects a fully composed `SupportReplyGenerator`. Fixture mode returns the deterministic domain implementation. Anthropic mode creates an Anthropic `StreamingTextModel`, then injects it into the model-backed support reply generator:

```ts
anthropic: () =>
  createModelSupportReplyGenerator(createAnthropicStreamingTextModel({ apiKey, model }));
```

This is the point where the layers become executable rather than merely conceptual. The HTTP server still depends on one `SupportReplyGenerator`; configuration decides how that capability is assembled at startup.

Both `MODEL_API_KEY` and `MODEL_NAME` are required for remote providers. Making the model name explicit improves reproducibility and allows changing models without modifying source code. The fixture factory and remote factories remain lazy, so fixture mode never initializes the Anthropic client.

The composition test injects a fake `StreamingTextModel` and verifies the entire handoff from ticket to prompt to streamed model text without making a network request.

## 2026-09-02 — Treating stream failures as protocol events

The HTTP request handling was extracted into `createAgentAssistServer`, which accepts a `SupportReplyGenerator`. The production entry point now handles only configuration, dependency composition, and listening on a port. Tests can start the same server on an ephemeral port with controlled generator implementations.

Model streaming can fail before output, after partial output, or because the user disconnected. Those cases now have distinct behavior:

```text
successful stream  -> start, delta..., complete
provider failure   -> start, optional delta..., error
client disconnect  -> abort generation and stop writing
```

Provider failures are reported on the server, but the browser receives a stable, sanitized message. This prevents SDK errors, request identifiers, or other internal details from leaking into the UI:

```ts
{
  type: "error",
  requestId,
  message: "The suggested reply could not be generated.",
}
```

If failure happens after text has streamed, the error event follows the partial deltas and no `complete` event is sent. The reducer already retains the partial draft when entering its error state, so useful work is not discarded.

Client disconnects are not reported as provider failures. The response's `close` event aborts the shared signal, and every write checks the signal and response state first. This avoids attempting to send completion or error events to a closed connection.

The tests exercise the real HTTP and SSE boundary using a temporary local port. This provides more confidence than testing helper functions alone while remaining fast and independent of external services.

## 2026-09-02 — Proving the model boundary with a second provider

Adding OpenAI was the practical test of whether `StreamingTextModel` was genuinely provider-neutral. The support-domain code and HTTP streaming route did not change. Only a new adapter and one provider registration were required:

```text
TextPrompt
  -> OpenAIStreamingTextModel
  -> OpenAI Responses API event stream
  -> response.output_text.delta
  -> AsyncIterable<string>
```

The adapter uses the OpenAI Responses API with `stream: true`. OpenAI emits lifecycle, output-item, and text events, but the application needs only generated text. A runtime type guard filters for `response.output_text.delta` and verifies that `delta` is a string before yielding it.

The adapter also sends `store: false` and applies a default `max_output_tokens` value of 500. The output limit bounds an individual response; it is not a complete spending limit because the number and size of requests must also be controlled. Fixture mode therefore remains the default, and remote providers must be selected explicitly.

Constructor injection keeps the adapter test independent of the network:

```ts
createOpenAIStreamingTextModel({
  apiKey: "test-key",
  model: "test-model",
  requestStream: fakeRequestStream,
});
```

The fake stream includes both lifecycle events and text-delta events. Tests prove that only text is yielded, the abort signal reaches the SDK boundary, request options are translated correctly, and provider failures propagate to the server's sanitized error handling.

Provider selection remains lazy. Choosing `fixture` initializes neither remote SDK client; choosing `openai` creates only the OpenAI adapter; choosing `anthropic` creates only the Anthropic adapter. This matters for both clean configuration and cost safety.

This addition demonstrates the difference between an abstraction and an inheritance hierarchy. Neither provider adapter extends a `BaseModel`. Both independently satisfy the small `StreamingTextModel` capability, while provider-specific request and event details stay inside their respective files. Swapping providers is composition at startup rather than branching throughout the application.

### Colocating each provider adapter

Once a second model provider existed, keeping every model file in one flat directory made the boundary less visible. Each provider now has a folder containing its implementation, tests, and local export:

```text
models/
  Anthropic/
    AnthropicStreamingTextModel.ts
    AnthropicStreamingTextModel.test.ts
    index.ts
  OpenAI/
    OpenAIStreamingTextModel.ts
    OpenAIStreamingTextModel.test.ts
    index.ts
  types.ts
  index.ts
```

The shared `StreamingTextModel` contract stays at the models root because it belongs to neither provider. The root `index.ts` is the public boundary used by the rest of the server, while each provider's `index.ts` makes its folder independently navigable and keeps tests beside the code they exercise.

This structure adds a little ceremony, but it scales predictably: adding another provider means adding another self-contained folder and one root export rather than expanding a mixed directory of similarly named files.

### Naming the domain layer by capability

The server's `generation` folder was renamed to `supportReplies`. Although the old name was technically accurate, it did not reveal whether the files generated UI content, test data, or model output. The new name identifies the business capability owned by the folder.

The deterministic generator moved into its own `Fixture` folder with its test and export. It is a runtime implementation—not test scaffolding—because the application deliberately uses it for free, reproducible local development. The shared support-reply contract, prompt builder, model-backed bridge, and provider composition remain at the `supportReplies` root because they apply across implementations.

## 2026-09-02 — Buffering streams for reduced motion

The existing reduced-motion CSS removed transitions and animations, but it did not change the most active visual behavior: every model delta still repainted the textarea. A stream of tiny text changes can resemble a typewriter effect even when no CSS animation is involved.

The implementation separates three responsibilities:

```text
usePrefersReducedMotion
  -> observes the operating-system preference

createDraftDeltaBuffer
  -> groups provider-neutral text deltas

useDraftWorkspace
  -> chooses immediate or buffered state updates
```

`usePrefersReducedMotion` uses React's `useSyncExternalStore`. A media query is state owned by the browser, so subscribing to its snapshots is a better fit than copying its value into `useState` from an effect. The initial effect-based implementation worked in tests, but lint correctly identified the unnecessary synchronous state update and extra render.

The delta buffer is plain TypeScript rather than a hook. It emits text at the last completed sentence boundary or after a one-second maximum wait. Splitting at the last boundary lets it flush complete prose while retaining an unfinished tail:

```text
pending: "First sentence. Part"
flush:   "First sentence."
retain:  " Part"
```

The timer prevents a long sentence from leaving the visual interface blank indefinitely. A sentence boundary produces meaningful, less-frequent visual updates; the timer is the fallback for model output without punctuation.

Stream lifecycle events need deliberate buffer behavior:

```text
complete / stop / error  -> flush pending text first
new request / unmount    -> clear pending text and timer
reduced motion disabled  -> flush, then resume immediate deltas
```

Flushing before Stop is especially important. The server may already have delivered text that has not reached React state yet; discarding the buffer would violate the promise that cancellation retains the partial draft.

The screen-reader strategy remains unchanged. The textarea receives either immediate or buffered visual text, while the ARIA live region announces only lifecycle milestones such as generation starting, stopping, or becoming ready. Reduced motion changes visual update frequency without turning provisional model output into a spoken transcript.

## 2026-09-02 — Adding the first browser-level workflow test

The existing Vitest suite checks components, hooks, reducers, adapters, and the real HTTP/SSE boundary in isolation. Cypress adds a different kind of confidence: it starts the frontend and API together, opens the application in Chrome, and interacts with the interface like a user.

The first end-to-end test follows one complete review path:

```text
select ticket
  -> request fixture draft
  -> observe streaming state
  -> wait for the completed reply
  -> edit the suggestion
  -> approve the reviewed text
```

Selectors use the application's existing labels, element IDs, button text, and visible state rather than adding attributes solely for Cypress. This makes the test exercise the same accessible interface exposed to users.

The test command forces `DRAFT_PROVIDER=fixture`. End-to-end tests should be deterministic and inexpensive, so the normal suite must never depend on an API key, remote-model availability, variable output, or paid requests. Model SDK behavior remains covered by injected fake streams in Vitest; Cypress verifies that the provider-neutral application path works as a whole.

Vitest and Cypress are complementary rather than interchangeable. Vitest gives fast, focused failure messages for application logic. Cypress is slower, but catches integration failures involving the compiled browser UI, network proxy, API server, SSE transport, and user interactions.

The committed commands use Cypress's standard user-level binary cache. A project-local cache was useful inside the restricted development environment, but encoding that location in `package.json` would make a fresh clone fail because the downloaded browser is intentionally excluded from Git. Machine-specific workarounds should stay outside the shared project contract.

## 2026-09-02 — Documenting the critical user journey

The README now includes a Mermaid sequence diagram for the successful draft-review path. A sequence diagram fits this feature better than a component tree because the key complexity is temporal: an action crosses the UI, workspace hook, API, and generator before a series of SSE events travels back to the user.

The diagram deliberately describes the reply generator as a capability rather than drawing provider-specific branches. Fixture, OpenAI, and Anthropic selection is a server composition detail; the critical user journey remains the same. Cancellation and error behavior are mentioned as branches without crowding the happy path that a new reader needs to understand first.

### Tracing the implementation by file

The high-level sequence explains system behavior, but it does not answer the practical debugging question: “Where would I put a breakpoint?” A second diagram maps the request to concrete source files, and a linked table describes each file's responsibility.

The trace separates startup composition from runtime execution. Configuration and provider selection run once when the API starts; an individual draft request uses the already-injected `SupportReplyGenerator`. This avoids implying that the request handler repeatedly reads configuration or chooses a provider for every text delta.

The response path also demonstrates why a network chunk is not the same thing as an application event. `streamDraft.ts` reads arbitrary bytes, `parseSse.ts` reconstructs complete SSE messages, and only then does `useDraftWorkspace.ts` decide whether a delta should reach the reducer immediately or pass through the reduced-motion buffer.

## 2026-09-02 — Making verification visible with CI

The local verification commands now run automatically on pushes to `main` and on pull requests. The quality job installs from the lockfile, checks formatting and linting, runs the Vitest suite, and creates a production build. A separate Cypress job starts both local processes with the fixture provider and runs the critical user journey in Chrome.

The two jobs are independent so fast source-quality failures and slower browser-integration failures are reported separately. The Cypress job uses no model secret and cannot incur provider charges; `DRAFT_PROVIDER=fixture` is explicit at the job boundary.

The workflow grants only read access to repository contents. No deployment, package publication, Cypress Cloud recording, or write token is needed for this verification stage.

## 2026-09-02 — Separating the GraphQL tools by responsibility

The GraphQL implementation introduced three tools that are easy to conflate at first:

```text
Express/Fastify → general-purpose HTTP server framework
GraphQL Yoga    → GraphQL-focused server framework
Apollo Client   → frontend GraphQL request and caching library
```

The project already has a small Node HTTP server, so Yoga is not being introduced as a replacement for the backend. It combines the schema and resolvers, validates incoming GraphQL operations, executes the requested fields, and formats the response at `/graphql`. Apollo Client will later send operations from React and cache the returned application entities.

This boundary also reinforces why the AI stream remains separate. Yoga and Apollo handle structured, cacheable ticket and approval data; the existing HTTP/SSE route continues carrying transient text deltas.

### Extracting the draft-stream capability

Adding a second API style made the original server file's mixed responsibilities obvious. The route table remains in `createAgentAssistServer`, while request parsing, ticket validation, SSE formatting, cancellation, and provider-error handling now live together in `draftStream/createDraftStreamHandler.ts`.

The extraction follows capability boundaries rather than placing every helper in its own file. `readJson`, `sendEvent`, and `canWrite` are implementation details used only by the draft-stream handler, so keeping them colocated makes that behavior easier to trace without creating a directory full of tiny abstractions.

The remaining server factory and its integration test moved into `AgentAssistServer/` with a local `index.ts`. Colocating the test with the factory keeps the server root focused on application startup and capability folders, while the named export preserves a short import from `server/index.ts`.

### Configuring the Apollo boundary

The frontend now has an `ApolloClient` configured with an `HttpLink` to `/graphql` and an `InMemoryCache`. `ApolloProvider` places that client in React context, allowing descendant components to use GraphQL hooks without importing a singleton into each component.

The first `Tickets` operation is represented as a typed document, but no component executes it yet. Keeping query definition separate from query execution gives the next change a narrow goal: replace the frontend's direct fixture import with data returned by `useQuery`.
