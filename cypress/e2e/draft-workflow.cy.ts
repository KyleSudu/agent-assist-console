import type axe from "axe-core";

const fixtureReply =
  "Hi Jordan, thanks for sharing the browsers and file details you already tested. Please rename one image using only letters and numbers, then try uploading it in a private browser window. If it still remains on processing, reply with the approximate upload time so we can investigate the failed job. Your existing listing will remain available while we check this.";

type AxeWindow = Window & typeof globalThis & { axe: typeof axe };

const expectNoSeriousAccessibilityViolations = () => {
  cy.readFile<string>("node_modules/axe-core/axe.min.js").then((source) => {
    cy.window().then(async (window) => {
      window.eval(source);
      const { violations } = await (window as AxeWindow).axe.run(window.document);
      const seriousViolations = violations.filter(
        ({ impact }) => impact === "serious" || impact === "critical",
      );

      expect(
        seriousViolations,
        seriousViolations.map(({ id, help }) => `${id}: ${help}`).join("\n"),
      ).to.deep.equal([]);
    });
  });
};

describe("draft workflow", () => {
  it("generates, edits, and approves a support reply", () => {
    cy.visit("/");

    cy.get("#ticket-select").select("technical-photo-upload");
    cy.contains("h3", "Listing photos will not finish uploading").should("be.visible");
    expectNoSeriousAccessibilityViolations();

    cy.contains("button", "Draft reply").click();
    cy.contains("button", "Stop generating").should("be.visible");
    cy.get("#draft-text").should("not.have.value", "");
    cy.get("#draft-text", { timeout: 15_000 })
      .should("have.value", fixtureReply)
      .and("not.have.attr", "readonly");
    expectNoSeriousAccessibilityViolations();

    const reviewedReply = `${fixtureReply} — Reviewed by an agent.`;
    cy.get("#draft-text").clear().type(reviewedReply);
    cy.contains("button", "Approve reply").click();

    cy.contains(".state-badge", "approved").should("be.visible");
    cy.get("#draft-text").should("have.value", reviewedReply).and("have.attr", "readonly");
    cy.contains("button", "Approve reply").should("be.disabled");
    expectNoSeriousAccessibilityViolations();
  });
});
