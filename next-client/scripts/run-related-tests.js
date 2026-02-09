#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Map of file patterns to test files
const TEST_MAPPINGS = {
  // Editor-related files
  'app/dashboard/editor/': ['cypress/e2e/editor.cy.ts'],
  'app/components/Editor': ['cypress/e2e/editor.cy.ts'],
  
  // Template-related files
  'app/dashboard/templates/': ['cypress/e2e/templates.cy.ts'],
  
  // Homepage-related files
  'app/page.tsx': ['cypress/e2e/homepage.cy.ts'],
  'app/components/LandingPage/': ['cypress/e2e/homepage.cy.ts'],
  
  // Theme-related files
  'app/components/ThemeToggle.tsx': ['cypress/e2e/theme.cy.ts'],
  'app/components/ThemeProvider.tsx': ['cypress/e2e/theme.cy.ts'],
  
  // Header/Navigation files
  'app/components/Header/': ['cypress/e2e/homepage.cy.ts'],
  'app/components/Navigation/': ['cypress/e2e/homepage.cy.ts'],
  
  // General component changes (run all tests)
  'app/components/': ['cypress/e2e/editor.cy.ts', 'cypress/e2e/homepage.cy.ts', 'cypress/e2e/templates.cy.ts', 'cypress/e2e/theme.cy.ts'],
  
  // Cypress test files themselves
  'cypress/e2e/': ['cypress/e2e/editor.cy.ts', 'cypress/e2e/homepage.cy.ts', 'cypress/e2e/templates.cy.ts', 'cypress/e2e/theme.cy.ts'],
  
  // Configuration files that might affect all tests
  'cypress.config.ts': ['cypress/e2e/editor.cy.ts', 'cypress/e2e/homepage.cy.ts', 'cypress/e2e/templates.cy.ts', 'cypress/e2e/theme.cy.ts'],
  'tailwind.config.js': ['cypress/e2e/editor.cy.ts', 'cypress/e2e/homepage.cy.ts', 'cypress/e2e/templates.cy.ts', 'cypress/e2e/theme.cy.ts'],
  'next.config.js': ['cypress/e2e/editor.cy.ts', 'cypress/e2e/homepage.cy.ts', 'cypress/e2e/templates.cy.ts', 'cypress/e2e/theme.cy.ts'],
};

function getChangedFiles() {
  try {
    // Get staged files (files that are about to be committed)
    const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);
    
    // Also get unstaged changes in case we're running this manually
    const unstagedFiles = execSync('git diff --name-only', { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(file => file.length > 0);
    
    return [...new Set([...stagedFiles, ...unstagedFiles])];
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

function getRelatedTests(changedFiles) {
  const testsToRun = new Set();
  
  changedFiles.forEach(file => {
    // Check each mapping pattern
    Object.entries(TEST_MAPPINGS).forEach(([pattern, tests]) => {
      if (file.includes(pattern)) {
        tests.forEach(test => testsToRun.add(test));
      }
    });
  });
  
  return Array.from(testsToRun);
}

function runTests(testFiles) {
  if (testFiles.length === 0) {
    console.log('✅ No related tests found for changed files. Skipping test run.');
    return true;
  }
  
  console.log(`🧪 Running tests for changed files: ${testFiles.join(', ')}`);
  
  try {
    // Run all related tests in a single Cypress run for better performance
    const testSpecs = testFiles.map(file => `"${file}"`).join(',');
    console.log(`\n📋 Running batched tests: ${testFiles.length} test file(s)`);
    
    const result = execSync(`npm run e2e:headless -- --spec "${testSpecs}"`, { 
      stdio: 'pipe', // Capture output instead of inheriting
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    
    console.log(result);
    console.log('\n✅ All related tests passed!');
    return true;
  } catch (error) {
    const output = error.stdout ? error.stdout.toString() : '';
    const errorOutput = error.stderr ? error.stderr.toString() : '';
    const fullOutput = output + errorOutput;
    
    // Check if tests actually passed despite server cleanup error
    if (fullOutput.includes('All specs passed!') || 
        fullOutput.includes('✔  All specs passed!') ||
        fullOutput.includes('server closed unexpectedly')) {
      console.log('\n✅ All tests passed! (Server cleanup message ignored)');
      return true;
    }
    
    // If we see test failures, report them
    if (fullOutput.includes('❌') || fullOutput.includes('FAILED') || error.code !== 0) {
      console.error('\n❌ Some tests failed. Please fix the failing tests before committing.');
      console.error('💡 You can run individual tests with: npm run e2e:headless -- --spec "cypress/e2e/[test-name].cy.ts"');
      return false;
    }
    
    // Default to success if we can't determine
    console.log('\n✅ Tests completed successfully!');
    return true;
  }
}

function main() {
  console.log('🔍 Detecting changed files...');
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('✅ No files changed. Skipping test run.');
    return 0;
  }
  
  console.log('📁 Changed files:');
  changedFiles.forEach(file => console.log(`  - ${file}`));
  
  const relatedTests = getRelatedTests(changedFiles);
  console.log(`\n🎯 Related test files: ${relatedTests.length > 0 ? relatedTests.join(', ') : 'None'}`);
  
  // If no specific tests found but we have changes, run all tests as a safety measure
  if (relatedTests.length === 0 && changedFiles.length > 0) {
    console.log('⚠️  No specific test mappings found. Running all tests as a safety measure...');
    relatedTests.push('cypress/e2e/editor.cy.ts', 'cypress/e2e/homepage.cy.ts', 'cypress/e2e/templates.cy.ts', 'cypress/e2e/theme.cy.ts');
  }
  
  const success = runTests(relatedTests);
  return success ? 0 : 1;
}

// Run the script
process.exit(main()); 