describe("Editor", () => {
  beforeEach(() => {
    cy.visit("/dashboard/editor");
    // Dismiss cookie consent if present
    cy.get('body').then($body => {
      if ($body.find('button:contains("Accept All")').length > 0) {
        cy.contains('button', 'Accept All').click();
      }
    });
    // Wait for editor page to load - check for editor-specific content
    cy.contains("file.md").should("be.visible");
    cy.get('[data-testid="editor-textarea"]', { timeout: 10000 }).should("be.visible");
  });

  it("Can use keyboard shortcuts", () => {
    // Type some content
    cy.get('[data-testid="editor-textarea"]').click().type("Test content");
    
    // Test save shortcut (Cmd/Ctrl + S)
    cy.get("body").type("{cmd}s");
    
    // Should trigger save (check for any save-related feedback)
    // Note: This might show a toast or other feedback
  });

  it("Can export content", () => {
    // Type some content
    cy.get('[data-testid="editor-textarea"]').click().type("# Export Test{enter}{enter}This content should be exportable.");
    
    // Look for export functionality - the export button is in the sidebar
    cy.get('button[title="Export to PDF"]').should("be.visible").click();
    
    // Should trigger export functionality
    // Note: Actual file download testing might require additional setup
  });
}); 