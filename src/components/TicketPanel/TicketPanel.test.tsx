import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tickets } from "shared";
import { TicketPanel } from ".";

describe("TicketPanel", () => {
  it("presents the selected ticket and reports a new selection", async () => {
    const user = userEvent.setup();
    const onSelectTicket = vi.fn();

    render(
      <TicketPanel
        tickets={tickets}
        selectedTicket={tickets[0]}
        selectedTicketId={tickets[0].id}
        selectionDisabled={false}
        onSelectTicket={onSelectTicket}
      />,
    );

    expect(screen.getByRole("heading", { name: tickets[0].subject })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Select a synthetic ticket"), tickets[1].id);

    expect(onSelectTicket).toHaveBeenCalledWith(tickets[1].id);
  });

  it("prevents ticket changes while generation is active", () => {
    render(
      <TicketPanel
        tickets={tickets}
        selectedTicket={tickets[0]}
        selectedTicketId={tickets[0].id}
        selectionDisabled
        onSelectTicket={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Select a synthetic ticket")).toBeDisabled();
  });
});
