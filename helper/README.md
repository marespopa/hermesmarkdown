# Local project-check helper

The helper runs the fixed `typecheck` and `unit-tests` checks for an explicitly selected local project directory. It accepts a check ID only; it has no shell command field. Start it from the HermesMarkdown repository with Node.js:

```sh
node helper/start.mjs --root /absolute/path/to/next-client
```

On Windows, use an absolute Windows path. Keep the terminal open, then pair the one-time code in Settings → AI Features. The helper binds only to `127.0.0.1:43125`. Pairing uses a random code and a short-lived in-memory bearer token. Stop the helper to revoke that token.

Every check requires a separate approval in the companion. The approval shows the catalog label, fixed argv, selected project root, timeout, network policy and output destination. The helper copies the selected project into a disposable temporary workspace and runs the check there, so the selected project tree is not modified by generated files or test changes. The helper removes environment variables except basic process paths and temporary-directory settings, disables Corepack/Yarn network access where supported, uses no shell, limits output and time, and terminates the child process group on cancellation. OS-level network denial is best effort, not a sandbox guarantee: project code can still access local resources available to the helper process. Run checks only for a project you trust.

The helper does not receive vault file contents, chat history or AI credentials. Browser vault / OPFS and mobile vaults do not provide a filesystem path and are unsupported; use the browser-side `check_file` syntax tool instead. Output is redacted and bounded, visible as local-process output, and is not saved in the thread or vault.
