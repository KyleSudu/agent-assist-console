import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the selected synthetic ticket", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByLabelText("Select a synthetic ticket"), "account-login-code");

    expect(screen.getByRole("heading", { name: "Login code sent to an old number" })).toBeInTheDocument();
  });
});
