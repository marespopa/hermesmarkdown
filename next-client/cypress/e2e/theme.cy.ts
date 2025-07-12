describe("Theme", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.viewport(1280, 900);
  });

  it("Can toggle dark theme", () => {
    // Check initial theme (should be light by default)
    cy.get("html").should("not.have.class", "dark");
    
    // Click theme toggle
    cy.get('[data-testid="theme-toggle"]').click();
    
    // Should switch to dark theme
    cy.get("html").should("have.class", "dark");
    
    // Click theme toggle again
    cy.get('[data-testid="theme-toggle"]').click();
    
    // Should switch back to light theme
    cy.get("html").should("not.have.class", "dark");
  });
}); 