---
name: build-and-test
description: Runs the production build and the Vitest suite from next-client, reports any failures with relevant output. Use only when the user asks to build or test.
tools: Bash
---

From the `next-client` directory, run `corepack yarn build`. If it fails, report the full error output and stop.

If the build passes, run `corepack yarn test --run` (plain `yarn test` starts Vitest in watch mode). Report whether all tests passed or list any failing tests with their error messages.

Keep the report concise: one line for success, or the relevant failure excerpt (not the full raw output) for failures.
