import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tickets } from "shared";
import { TicketSelector } from ".";

describe("TicketSelector", () => {
  it("reports the selected ticket", async () => {
    const user = userEvent.setup();
    const onSelectTicket = vi.fn();

    render(
      <TicketSelector
        tickets={tickets}
        selectedTicketId={tickets[0].id}
        disabled={false}
        onSelectTicket={onSelectTicket}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Select a synthetic ticket"), tickets[1].id);

    expect(onSelectTicket).toHaveBeenCalledWith(tickets[1].id);
  });

  it("disables selection when requested", () => {
    render(
      <TicketSelector
        tickets={tickets}
        selectedTicketId={tickets[0].id}
        disabled
        onSelectTicket={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Select a synthetic ticket")).toBeDisabled();
  });
});
