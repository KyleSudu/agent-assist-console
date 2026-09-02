import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Ticket } from "shared";
import { TicketDetails } from ".";

const ticket: Ticket = {
  id: "ticket-1",
  customerName: "Maya Chen",
  subject: "Duplicate charge",
  body: "I see two pending charges.",
};

describe("TicketDetails", () => {
  it("presents the selected ticket", () => {
    render(<TicketDetails ticket={ticket} />);

    expect(screen.getByText("From Maya Chen")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Duplicate charge" })).toBeInTheDocument();
    expect(screen.getByText("I see two pending charges.")).toBeInTheDocument();
  });
});
