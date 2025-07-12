import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3001",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    // Reduced timeouts for faster failure detection
    defaultCommandTimeout: 5000,
    requestTimeout: 5000,
    responseTimeout: 5000,
    // Enable parallel execution
    experimentalRunAllSpecs: true,
    // Performance optimizations
    numTestsKeptInMemory: 0, // Don't keep tests in memory
    retries: {
      runMode: 1, // Retry failed tests once in CI
      openMode: 0, // No retries in open mode
    },
    // Faster page loads
    pageLoadTimeout: 10000,
    // Optimize for speed
    watchForFileChanges: false,
    // Reduce unnecessary screenshots
    screenshotOnRunFailure: false,
    // Disable video recording for speed
    video: false,
    // Optimize browser settings
    chromeWebSecurity: false,
    // Reduce viewport for faster rendering
    viewportWidth: 1280,
    viewportHeight: 720,
  },
  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
});
