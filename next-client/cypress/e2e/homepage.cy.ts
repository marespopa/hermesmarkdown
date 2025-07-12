describe("Homepage", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.viewport(1280, 900);
  });

  it("Loads homepage correctly", () => {
    // Wait for hydration
    cy.get("header").should("be.visible");
    cy.get("header img[alt='Hermes Markdown']").should("be.visible");

    // Navigation (desktop only)
    cy.get('[data-testid="navigation"]').should("exist").and("be.visible");
    cy.get('[data-testid="navigation"]').contains("Home").should("be.visible");
    cy.get('[data-testid="navigation"]').contains("Learn Markdown").should("be.visible");
    cy.get('[data-testid="navigation"]').contains("FAQ").should("be.visible");

    // Theme toggle
    cy.get('[data-testid="theme-toggle"]').should("be.visible");

    // Main content - check for the actual content on the homepage
    cy.contains("Choose Your Path:").should("be.visible");
    cy.contains("Editing Options in Hermes Markdown").should("be.visible");
    
    // Check for the three main options
    cy.contains("New File").should("be.visible");
    cy.contains("New from Template").should("be.visible");
    cy.contains("Import File").should("be.visible");
  });

  it("Can navigate to dashboard and use editor", () => {
    // Click on "New File" option
    cy.contains("New File").click();
    
    // Should be on editor page
    cy.url().should("include", "/dashboard/editor");
    
    // Wait for editor to load and be visible
    cy.get('[data-testid="editor-textarea"]', { timeout: 10000 }).should("be.visible");
    
    // Type some markdown content
    cy.get('[data-testid="editor-textarea"]').clear().type("# Hello World\n\nThis is a **test** of the editor.\n\n- Item 1\n- Item 2");
    
    // Check that preview shows the content (if in split view)
    cy.get("body").then(($body) => {
      if ($body.find('[data-testid="preview"]').length > 0) {
        cy.get('[data-testid="preview"]').should("contain", "Hello World");
        cy.get('[data-testid="preview"]').should("contain", "This is a test of the editor");
        cy.get('[data-testid="preview"]').should("contain", "Item 1");
        cy.get('[data-testid="preview"]').should("contain", "Item 2");
      }
    });
  });
}); 