# Accessible Agent-Assist Console

An independent technical prototype exploring how a support-agent workstation should present streamed generative AI output to keyboard and screen-reader users.

> **Status:** Pre-v0 portfolio work. The project uses synthetic data and deterministic generation while the interaction model is being developed. It is not a production service and is not affiliated with any company or support platform.

This is not a general chatbot. It is a narrow human-review workflow: an agent selects a synthetic support ticket, requests a suggested reply, interrupts the generation if needed, edits the result, and approves it.

## The problem

Streaming text creates two different experiences. A visual user can benefit from seeing a draft appear incrementally, but placing those updates in an ARIA live region can make a screen reader announce an unusable stream of partial words and repeated content.

The project tests a deliberate split:

- The visual interface receives incremental draft updates.
- Assistive technology receives concise lifecycle milestones such as “Generating suggested reply” and “Suggestion ready.”
- The Stop action remains keyboard-accessible while generation is active.
- Cancellation retains the partial draft and prevents late events from changing it.
- Completing or stopping a stream does not move focus automatically.

The goal is not merely to call a model API. The goal is to make provisional model output reviewable, interruptible, and understandable.

## Current status

The repository currently contains a working deterministic vertical slice:

- Four synthetic customer-support tickets
- A React and strict TypeScript interface
- A separate Node API process
- A typed server-sent event protocol
- Simulated incremental reply generation
- Request cancellation and stale-response protection
- Editing and approval of partial or completed drafts
- Milestone-only screen-reader status messages
- Unit tests for reducer behavior, stream parsing, and ticket selection

The deterministic generator is intentional. It makes the interaction reproducible, keeps automated tests independent of an external service, and establishes the boundary that a real model adapter will use later.

## Architecture

```text
React interface
  -> streaming fetch client
  -> typed SSE parser
  -> reducer-driven draft state

Node API
  -> validates the ticket and request id
  -> provider-neutral draft generator interface
  -> deterministic fixture adapter (current)
  -> remote model adapters (planned)
  -> emits start, delta, complete, or error events
```

The stream uses an HTTP `POST` with an SSE-formatted response. The browser reads it through `fetch()` and `ReadableStream` rather than `EventSource`, because the request includes a ticket payload.

GraphQL is intentionally not used for the token stream. A later iteration will use GraphQL and Apollo for discrete ticket, draft, and approval entities while leaving high-frequency generation updates on the streaming transport.

## Run locally

Install a current Node.js release, then run:

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>.

The client and API run as separate local processes:

```text
Client: http://127.0.0.1:5173
API:    http://127.0.0.1:8787
```

No API key is required for the deterministic stream.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Roadmap

### v0 - accessible generative streaming

- Harden keyboard and focus behavior with browser-level tests
- Buffer visual updates when reduced motion is requested
- Add a real model adapter behind the existing provider-neutral generator interface
- Test repeated cancellation for orphaned requests and late updates
- Document VoiceOver/Safari and NVDA/Firefox behavior
- Publish an accessibility writeup and short demonstration

### v1 - typed application data

- Add GraphQL Yoga, Apollo Client, and generated operation types
- Persist tickets, completed drafts, and approval status
- Keep token streaming outside Apollo's normalized cache

### v2 - confidence-driven review

- Add a small supervised classifier over synthetic fixtures
- Make confidence bands change the review workflow rather than merely displaying a score
- Evaluate and document the limitations of the synthetic dataset

### v3 - human feedback signal

- Capture the difference between generated and approved text
- Report edit rate and frequently edited passages as potential model-quality signals

Each version is independently demonstrable. Features are described as shipped only after their behavior and accessibility checks pass.

## Data and scope

All tickets and replies are synthetic. The project does not use real customer data.

Authentication, multi-tenancy, mobile layouts, conversation history, RAG, vector databases, agent frameworks, and production infrastructure are deliberately outside the current scope.
