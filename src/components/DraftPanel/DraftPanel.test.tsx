import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createInitialDraftState, type DraftState } from "state";
import { DraftPanel } from ".";

const initialDraftState = createInitialDraftState("billing-duplicate-charge");

const renderPanel = (state: DraftState) => {
  const props = {
    state,
    onGenerate: vi.fn(),
    onStop: vi.fn(),
    onEdit: vi.fn(),
    onApprove: vi.fn(),
  };

  render(<DraftPanel {...props} />);
  return props;
};

describe("DraftPanel", () => {
  it("keeps keyboard focus on the control when generation starts", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const props = {
      state: initialDraftState,
      onGenerate: vi.fn(),
      onStop,
      onEdit: vi.fn(),
      onApprove: vi.fn(),
    };
    const { rerender } = render(<DraftPanel {...props} />);

    screen.getByRole("button", { name: "Draft reply" }).focus();
    rerender(
      <DraftPanel
        {...props}
        state={{
          ...initialDraftState,
          phase: "streaming",
          requestId: "request-1",
          announcement: "Generating suggested reply.",
        }}
      />,
    );

    const stopButton = screen.getByRole("button", { name: "Stop generating" });
    expect(stopButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("starts generation from the idle state", async () => {
    const user = userEvent.setup();
    const props = renderPanel(initialDraftState);

    await user.click(screen.getByRole("button", { name: "Draft reply" }));

    expect(props.onGenerate).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Approve reply" })).toBeDisabled();
  });

  it("exposes cancellation while the draft is streaming", async () => {
    const user = userEvent.setup();
    const props = renderPanel({
      ...initialDraftState,
      phase: "streaming",
      requestId: "request-1",
      draft: "Partial reply",
      announcement: "Generating suggested reply.",
    });

    await user.click(screen.getByRole("button", { name: "Stop generating" }));

    expect(props.onStop).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox", { name: "Reply text" })).toHaveAttribute("readonly");
    expect(screen.getByRole("status")).toHaveTextContent("Generating suggested reply.");
  });

  it("reports edits and approval for a ready draft", async () => {
    const user = userEvent.setup();
    const props = renderPanel({
      ...initialDraftState,
      phase: "ready",
      draft: "Suggested reply.",
      announcement: "Suggestion ready. 1 sentence.",
    });

    fireEvent.change(screen.getByRole("textbox", { name: "Reply text" }), {
      target: { value: "Edited reply." },
    });
    await user.click(screen.getByRole("button", { name: "Approve reply" }));

    expect(props.onEdit).toHaveBeenCalledWith("Edited reply.");
    expect(props.onApprove).toHaveBeenCalledOnce();
  });
});
