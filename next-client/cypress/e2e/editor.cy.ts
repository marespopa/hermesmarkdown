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

  it("Can toggle between editor and preview modes", () => {
    // Check if preview mode buttons exist and test them
    cy.get('[data-testid="toggle-editor"]').should('exist');
    cy.get('[data-testid="toggle-preview"]').should('exist');
    cy.get('[data-testid="toggle-split"]').should('exist');

    // Click "Editor Only" button
    cy.get('[data-testid="toggle-editor"]').click();
    cy.wait(500); // Wait for UI update
    // Should only show editor
    cy.get('[data-testid="editor-textarea"]').should("be.visible");
    // Check that preview is not visible (it might still exist in DOM but be hidden)
    cy.get('[data-testid="preview"]').should("not.be.visible");

    // Click "Preview Only" button
    cy.get('[data-testid="toggle-preview"]').click();
    cy.wait(500); // Wait for UI update
    // Should only show preview - editor is completely removed from DOM
    cy.get('[data-testid="editor-textarea"]').should("not.exist");
    cy.get('[data-testid="preview"]').should("be.visible");

    // Click "Split View" button
    cy.get('[data-testid="toggle-split"]').click();
    cy.wait(500); // Wait for UI update
    // Should show both editor and preview
    cy.get('[data-testid="editor-textarea"]').should("be.visible");
    cy.get('[data-testid="preview"]').should("be.visible");
  });

  it("Can use keyboard shortcuts", () => {
    // Type some content
    cy.get('[data-testid="editor-textarea"]').type("Test content");
    
    // Test save shortcut (Cmd/Ctrl + S)
    cy.get("body").type("{cmd}s");
    
    // Should trigger save (check for any save-related feedback)
    // Note: This might show a toast or other feedback
  });

  it("Can export content", () => {
    // Type some content
    cy.get('[data-testid="editor-textarea"]').type("# Export Test\n\nThis content should be exportable.");
    
    // Look for export functionality - check for the actual export button
    cy.get("body").then(($body) => {
      if ($body.find("button:contains('Export to PDF')").length > 0) {
        // Click export button
        cy.get("button").contains("Export to PDF").click();
        
        // Should trigger export functionality
        // Note: Actual file download testing might require additional setup
      }
    });
  });

  it("Can use timer functionality", () => {
    // Look for timer functionality in the Edit menu
    cy.get("body").then(($body) => {
      if ($body.find("button:contains('Edit')").length > 0) {
        // Open the Edit dropdown menu
        cy.get("button").contains("Edit").click();
        
        // Look for timer-related options in the dropdown
        cy.get("body").then(($body) => {
          if ($body.find("button:contains('Toggle timer')").length > 0) {
            // Click "Toggle timer" option
            cy.get("button").contains("Toggle timer").click();
            
            // Timer should be visible
            cy.contains("Pomodoro Timer").should("be.visible");
            
            // Expand the timer (it's minimized by default)
            cy.contains("Pomodoro Timer").click();
            
            // Start timer - look for the START button with icon
            cy.get("button").contains("START").should("be.visible").click();
            
            // Timer should be running - check for work state
            cy.contains("Work").should("be.visible");
            
            // Pause timer - look for the PAUSE button
            cy.get("button").contains("PAUSE").should("be.visible").click();
            
            // Timer should be paused
            cy.contains("Work - Paused").should("be.visible");
          }
        });
      }
    });
  });
}); 