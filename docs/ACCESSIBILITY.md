# Accessibility validation

The critical user journey is designed keyboard-first and treats streamed text as an accessibility concern separate from keyboard access. This document records what is verified automatically and what still requires assistive-technology testing.

## Verified automatically

- The ticket selector, Draft/Stop control, reply field, and approval control use native HTML elements.
- The primary controls follow the document's visual and reading order.
- Focus remains on the Draft/Stop button when generation begins, so Enter or Space can stop the stream without navigating again.
- Streaming never moves focus automatically.
- The draft is read-only while text is provisional and becomes editable when generation completes or stops.
- Screen-reader output is limited to lifecycle milestones through one polite, atomic status region; token deltas are not live announcements.
- Reduced-motion mode buffers visual deltas by sentence or time while preserving the same typed stream events.
- Cypress runs axe-core against the loaded, ready, and approved states and fails on serious or critical violations.

## Manual keyboard check

1. Use Tab to reach the ticket selector and change the ticket with arrow keys.
2. Tab to **Draft reply** and press Enter.
3. Confirm focus remains on **Stop generating** and press Enter to stop.
4. Tab to **Reply text**, edit the partial reply, then Tab to and activate **Approve reply**.
5. Confirm focus remains visible throughout and no interaction requires a pointer.

## VoiceOver and Safari check

This check must be performed manually on macOS before claiming screen-reader validation:

1. Start VoiceOver and navigate to the page using Safari.
2. Confirm both regions and every native control have understandable names.
3. Start generation and confirm the lifecycle message is announced once without token-by-token speech.
4. Stop and restart generation; confirm the status is understandable and focus is not moved.
5. Review, edit, and approve the draft using only the keyboard and VoiceOver commands.

Record the browser, operating-system version, result, and any issue below.

| Environment      | Result      | Notes                    |
| ---------------- | ----------- | ------------------------ |
| VoiceOver/Safari | Not yet run | Manual validation needed |

## Scope and limitations

Automated rules catch detectable semantic, naming, contrast, and structural failures; they cannot establish that the spoken experience is understandable. Passing axe-core is supporting evidence, not a claim of WCAG conformance. All tickets and replies are synthetic.
