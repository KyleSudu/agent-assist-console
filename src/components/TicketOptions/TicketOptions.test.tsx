import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { tickets } from "shared";
import { TicketOptions } from ".";

describe("TicketOptions", () => {
  it("renders an option for every ticket", () => {
    render(
      <select aria-label="Tickets">
        <TicketOptions tickets={tickets} />
      </select>,
    );

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(tickets.length);
    expect(options[0]).toHaveValue(tickets[0].id);
    expect(options[0]).toHaveTextContent(tickets[0].subject);
  });
});
