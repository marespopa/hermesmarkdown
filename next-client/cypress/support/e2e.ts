// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Performance optimizations
beforeEach(() => {
  // Disable uncaught exception handling for faster execution
  cy.on('uncaught:exception', () => false);
  
  // Optimize viewport for faster rendering
  cy.viewport(1280, 720);
});

// Global performance settings
Cypress.on('test:before:run', () => {
  // Disable screenshots for faster execution
  Cypress.config('screenshotOnRunFailure', false);
});
