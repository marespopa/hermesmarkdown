<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## TypeScript and Testing

Run JavaScript tooling from `next-client`, not the repository root. This
project pins Yarn 4.18.0 in `package.json` (`packageManager`); use Corepack so a globally
installed Yarn 1.x or `npm exec` does not bypass the repository dependencies.

```bash
cd next-client
corepack enable
corepack yarn install
corepack yarn tsc --noEmit
corepack yarn vitest run
```

For a focused test, pass the test file to Vitest:

```bash
corepack yarn vitest run app/editor/components/VaultFileTree.test.tsx
```

The package scripts are also available after dependencies are installed:

```bash
corepack yarn check
corepack yarn test --run app/editor/components/VaultFileTree.test.tsx
```

Do not use `npm exec tsc` or a globally installed `yarn` command for
validation. If `node_modules` is absent, install dependencies first; the
repository's TypeScript and Vitest binaries are expected to come from the
local install.
