import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Default for component/editor tests; pure-logic tests opt into
    // `// @vitest-environment node` to skip jsdom setup.
    environment: "jsdom",
    // Worker threads start much faster than forked processes (notably under proot).
    pool: "threads",
    testTimeout: 10_000,
    globals: true, // This fixes the "expect is not defined" error
    setupFiles: "./vitest.setup.ts",
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
    },
  },
});
