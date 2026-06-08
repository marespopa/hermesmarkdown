---
name: build-and-test
description: Runs npm run build and npm run test, reports any failures with relevant output. Use after making code changes to verify correctness before committing.
tools: Bash
---

Run `npm run build` in the project root. If it fails, report the full error output and stop.

If build passes, run `npm run test`. Report whether all tests passed or list any failing tests with their error messages.

Keep the report concise: one line for success, or the relevant failure excerpt (not the full raw output) for failures.
