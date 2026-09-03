import { MockedProvider } from "@apollo/client/testing/react";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Ticket } from "shared";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { TICKETS_QUERY } from "./graphql";

const testTickets: Ticket[] = [
  {
    id: "billing-duplicate-charge",
    customerName: "Maya Chen",
    subject: "Duplicate charge",
    body: "I see two pending charges.",
  },
  {
    id: "account-login-code",
    customerName: "Sam Rivera",
    subject: "Login code sent to an old number",
    body: "My code is being sent to my old phone.",
  },
];

const ticketsMock = {
  request: {
    query: TICKETS_QUERY,
  },
  delay: 50,
  result: {
    data: {
      tickets: testTickets,
    },
  },
};

describe("App", () => {
  it("presents the primary controls in a logical keyboard order", async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[ticketsMock]}>
        <App />
      </MockedProvider>,
    );

    const ticketSelector = await screen.findByLabelText("Select a synthetic ticket");

    await user.tab();
    expect(ticketSelector).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Draft reply" })).toHaveFocus();
  });

  it("loads tickets through GraphQL and allows ticket selection", async () => {
    const user = userEvent.setup();

    render(
      <MockedProvider mocks={[ticketsMock]}>
        <App />
      </MockedProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading tickets");

    await user.selectOptions(
      await screen.findByLabelText("Select a synthetic ticket"),
      "account-login-code",
    );

    expect(
      screen.getByRole("heading", {
        name: "Login code sent to an old number",
      }),
    ).toBeInTheDocument();
  });

  it("shows an accessible error when tickets cannot be loaded", async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: {
              query: TICKETS_QUERY,
            },
            error: new Error("GraphQL unavailable"),
          },
        ]}
      >
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Tickets could not be loaded");
  });
});
