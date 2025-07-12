describe("Templates", () => {
  beforeEach(() => {
    cy.visit("/");
    // Wait for homepage to load - check for any homepage content
    cy.contains(/Choose Your Path:|Let's get started!/).should("be.visible");
  });

  it("Can use templates", () => {
    // Click "New from Template" option (works for both desktop and mobile)
    cy.contains(/New from Template|Start from a Template/).click();

    // Wait for the dialog to appear (reduced timeout)
    cy.get("dialog", { timeout: 5000 }).should("be.visible");

    // Ensure the template list is loaded
    cy.contains("Select a Template", { timeout: 5000 }).should("be.visible");

    // Find the "Daily Standup Status" template and click its "Select" button
    cy.get("dialog").contains("Daily Standup Status").parent().find("button").contains("Select").click();

    // Wait for redirect to editor and for the editor to load
    cy.url().should("include", "/dashboard/editor");
    cy.get('[data-testid="editor-textarea"]', { timeout: 5000 }).should("be.visible");

    // Check that the template content is loaded
    cy.get('[data-testid="editor-textarea"]').should("contain", "Daily Standup Status");
    cy.get('[data-testid="editor-textarea"]').should("contain", "What did you accomplish yesterday");
  });
}); 