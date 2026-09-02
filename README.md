# Agent Assist Console

A narrow support-agent workstation for exploring accessible human review of streamed AI output.

The current scaffold uses a deterministic synthetic stream. It is intentionally useful without an API key and gives the real model adapter a stable interface to plug into later.

## Run locally

Requires a current Node.js release.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Current behavior

- Choose from four synthetic support tickets.
- Stream a deterministic suggested reply over typed server-sent events.
- Stop generation and retain partial text.
- Ignore late events from stale requests.
- Edit and approve a partial or completed suggestion.
- Announce stream milestones without narrating generated deltas.

## Intentional next steps

1. Harden cancellation and focus behavior with browser-level tests.
2. Add reduced-motion-specific stream buffering.
3. Add the Anthropic adapter behind the existing server interface.

GraphQL remains out of v0 until this accessible streaming path is tested and documented.
