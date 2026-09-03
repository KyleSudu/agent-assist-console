const fixtureReply =
  "Hi Jordan, thanks for sharing the browsers and file details you already tested. Please rename one image using only letters and numbers, then try uploading it in a private browser window. If it still remains on processing, reply with the approximate upload time so we can investigate the failed job. Your existing listing will remain available while we check this.";

describe("draft workflow", () => {
  it("generates, edits, and approves a support reply", () => {
    cy.visit("/");

    cy.get("#ticket-select").select("technical-photo-upload");
    cy.contains("h3", "Listing photos will not finish uploading").should("be.visible");

    cy.contains("button", "Draft reply").click();
    cy.contains("button", "Stop generating").should("be.visible");
    cy.get("#draft-text").should("not.have.value", "");
    cy.get("#draft-text", { timeout: 15_000 })
      .should("have.value", fixtureReply)
      .and("not.have.attr", "readonly");

    const reviewedReply = `${fixtureReply} — Reviewed by an agent.`;
    cy.get("#draft-text").clear().type(reviewedReply);
    cy.contains("button", "Approve reply").click();

    cy.contains(".state-badge", "approved").should("be.visible");
    cy.get("#draft-text").should("have.value", reviewedReply).and("have.attr", "readonly");
    cy.contains("button", "Approve reply").should("be.disabled");
  });
});
