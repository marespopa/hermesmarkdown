# AI Companion Skills and Project Checks

## Goal

Extend the companion in two bounded tracks:

1. Add a wizard for creating and editing vault-authored `type: skill` notes,
   with optional bindings to a fixed allowlist of existing companion tools.
   Skills remain declarative Markdown instructions; they must never load
   arbitrary JavaScript, shell, imports, or other executable code.
2. Add an explicitly approved project-check capability and document the
   boundary between browser-side vault checks and local process execution.

The existing browser tool registry remains the execution boundary for approved
skill bindings. Planning mode must continue to omit mutating and execution
capabilities.

## Existing behavior and extension points

### Skills

- `app/editor/components/ai-chat/user-skills.ts`
  - `isUserSkill`, `readUserSkill`, and `skillCommandFor` identify and load
    vault skills.
  - Current notes are instruction-only and are never created or edited by the
    app.
- `app/editor/components/ai-chat/use-chat-skills.ts`
  - `skillList`, `loadSkill`, and `commandSkill` merge built-in and user
    skills.
  - Built-ins win command collisions.
- `app/editor/components/ai-chat/chat-skills.ts`
  - Built-in declarative skills are `/template`, `/tasks`, and `/code`.
- `app/services/companion-tool-defs.ts`
  - Central Zod contracts and tool-name lists.
  - Add the skill-binding allowlist here, separately from the full registry.
- `app/editor/components/companion/use-companion-tools.ts`
  - Browser execution boundary for vault tools.
  - Enforce active skill bindings before dispatch, while retaining path,
    private-note, vault, and planning restrictions.
- `app/editor/components/companion/use-companion-writes.ts`
  - Reuse the existing write-through, undo, index-refresh, and disk-wins
    behavior for wizard-created and edited notes.

### Checks and planning mode

- `app/editor/components/companion/tools/check-tools.ts`
  - `checkFileOutput` is intentionally syntax-oriented and bounded to 500 KB
    input and 12 reported problems.
- `app/editor/components/companion/use-companion-tools.ts`
  - Existing `check_file` reads through `useNoteBuffer`, skips private files,
    and reports activity.
- `app/services/companion-tool-defs.ts`
  - `check_file` explicitly does not support types, imports, behavior, tests,
    or commands.
- `app/editor/components/companion/use-companion-chat.ts`
  - Detects `/plan` and builds the planning-specific request.
- `app/editor/components/companion/companion-prompt.ts`
  - `PLANNING_NOTE` prohibits mutating tools.
- `app/api/ai/companion/route.ts`
  - Removes `COMPANION_MUTATING_TOOL_NAMES` from planning requests.
- `app/api/ai/companion/route.tools.test.ts`
  - Covers planning-tool omission and must cover any new execution tool.

### Storage boundary

`next-client/ARCHITECTURE.md` documents disk and OPFS browser vaults. A
browser vault handle does not expose a local filesystem path, and a browser
cannot launch the vault's Node/Yarn binaries. “In the vault” is storage scope,
not process-execution capability. Mobile uses the same browser file layer.

## Proposed declarative skill schema

Keep the Markdown body as plain instructions and validate only known metadata:

```yaml
---
type: skill
description: Run the repository checks and summarize failures.
tools:
  - read_file
  - search_files
  - check_file
checks:
  - typecheck
  - unit-tests
---
```

Normalized metadata:

```ts
interface UserSkill {
  path: string;
  command: string;
  description?: string;
  toolBindings?: CompanionToolName[];
  projectChecks?: ProjectCheckId[];
}
```

Rules:

- Tool names and check IDs must come from fixed application allowlists.
- Unknown, duplicate, malformed, or disallowed values become validation
  warnings/errors; they never become executable input.
- Metadata cannot grant private-note access, bypass path guards, mutate the
  global tool registry, or introduce shell commands.
- A skill body is never evaluated as code.
- Decided semantics: bindings are hard restrictions only for a slash-activated skill. A model-loaded skill provides instructions only because the model tool schema cannot safely change mid-turn.

## Skill implementation plan

### New files

- `app/editor/components/ai-chat/skill-frontmatter.ts`
  - Pure parsing and validation of skill metadata.
  - Normalize tool bindings and project-check IDs.
  - Preserve unrelated frontmatter on edits.
- `app/editor/components/ai-chat/skill-frontmatter.test.ts`
  - Valid metadata, malformed YAML, unknown/duplicate bindings, disallowed
    mutations, missing values, and body-as-plain-text behavior.
- `app/editor/components/ai-chat/SkillWizard.tsx`
  - Create/edit form for name, description, instruction body, fixed tool
    bindings, and fixed project-check bindings.
  - Use project components such as `DialogModal`, `Button`, `Input`, and
    `BareInput`; no raw text inputs or buttons.
- `app/editor/components/ai-chat/SkillWizard.md`
  - Document purpose, state, props, validation, and save behavior.
- `app/editor/components/ai-chat/use-skill-wizard.ts`
  - Wizard state, validation, and save orchestration.
- `app/editor/components/ai-chat/SkillWizard.test.tsx`
  - Creation, editing, validation failures, no-write-on-error, and mocked
    file-system/note-buffer behavior.

### Existing files to update

- `app/editor/components/ai-chat/user-skills.ts`
  - Parse normalized metadata while preserving current skill discovery.
- `app/editor/components/ai-chat/use-chat-skills.ts`
  - Return skill metadata with loaded instructions and expose active-skill
    capability context without duplicating global state.
- `app/services/companion-tool-defs.ts`
  - Export the fixed binding allowlist.
- `app/editor/components/companion/use-companion-tools.ts`
  - Enforce active skill bindings before tool dispatch.
- `app/editor/components/companion/SlashMenu.tsx`
  - Optional `/skill` or “Create skill” entry if the final UX chooses a
    slash-menu entry.
- `app/editor/components/companion/CompanionComposer.tsx`
  - Only if the wizard is launched from the composer; keep slash-command
    parsing separate from wizard state.
- `app/hooks/file-system/use-create-item.ts`
  - Reuse the normal file layer only if creation delegates here; do not add a
    parallel write path.
- `app/editor/components/ai-chat/README.md`
  - Document skill discovery, metadata, and wizard behavior.
- Relevant component/directory README or sibling docs required by
  `next-client/AGENT_RULES.md`.

## Project-check contract

Do not expose a generic `command: string` to the model. Start with a fixed
catalog:

```ts
interface ProjectCheckDefinition {
  id: string;
  label: string;
  argv: string[];
  cwd: "vault" | "project";
  timeoutMs: number;
}
```

Initial IDs may include `typecheck` and `unit-tests`; add `lint` only if
product requirements explicitly include it. User-authored command definitions
are out of scope for the first increment.

### Proposed new files

- `app/services/project-checks.ts`
  - Fixed check catalog, argv validation, timeout/output limits, and check
    availability rules for disk versus browser vaults.
- `app/services/project-checks.test.ts`
  - Unknown IDs, arbitrary command rejection, shell syntax rejection, path
    escape rejection, and invalid timeout/output limits.
- `app/services/project-check-helper-client.ts`
  - Loopback helper protocol, pairing, approval request, streaming output,
    `AbortSignal`, timeout, disconnect, and cancellation handling.
- `app/services/project-check-helper-client.test.ts`
  - Fully mocked network boundary, abort/timeout, malformed responses,
    output caps, redaction, and helper disconnect behavior.

### Existing files to update

- `app/services/companion-tool-defs.ts`
  - Add `run_project_check` with a check ID only.
- `app/editor/components/companion/use-companion-tools.ts`
  - Dispatch approved checks, handle helper availability, cancellation, and
    bounded output.
- `app/editor/components/companion/companion-prompt.ts`
  - State that project checks require approval, are not arbitrary commands,
    and are unavailable for OPFS/mobile without a supported helper.
- `app/editor/components/companion/companion-chat-store.ts`
  - Track pending approval/helper lifecycle without persisting raw execution
    output in the chat store.
- `app/editor/components/companion/PlanCard.tsx`
  - Update only if check proposals or progress are shown in plan cards.
- `app/api/ai/companion/route.tools.test.ts`
  - Verify planning requests omit `run_project_check`; do not execute the
    helper from the Next.js route.

### Approval and status UI

Add only if the existing companion activity UI cannot represent these states:

- `app/editor/components/companion/ProjectCheckApproval.tsx`
- `app/editor/components/companion/ProjectCheckApproval.md`
- `app/editor/components/companion/ProjectCheckOutput.tsx`
- `app/editor/components/companion/ProjectCheckOutput.md`
- Update `CompanionMessage.tsx`, `CompanionThread.tsx`,
  `ToolActivityChip.tsx`, and `app/editor/components/companion/README.md`.

The UI must distinguish syntax checks from approved local checks and show
available, denied, unavailable, timed out, cancelled, failed, and nonzero-exit
results.

## Architecture comparison and MVP recommendation

### Browser runtime

Bundle browser-compatible, pinned TypeScript and test tooling and run it in a
worker/isolated browser context with no shell, native modules, or network.

Advantages:

- Works with disk and OPFS content without exposing a local path.
- Smaller host permission surface and compatible with mobile.
- Keeps execution in the browser and can remain zero-cloud.

Limitations:

- Cannot run the repository's real Node/Yarn commands.
- Package resolution, transforms, test environments, framework plugins, and
  native modules would need browser replacements.
- Bundles are large and can diverge from CI/local behavior.
- Running arbitrary test code still requires a strong worker/iframe boundary.

### Local helper

Install a separately paired helper that accepts a check ID and runs its fixed
argv in a user-approved project directory, without a shell.

Advantages:

- Runs the repository's real Node/Yarn/TypeScript/Vitest toolchain.
- Correct dependency resolution and project behavior.
- Keeps the web bundle small.

Limitations:

- Requires installation, pairing, project-folder selection, and a secure
  loopback protocol.
- Does not work for OPFS or mobile browser vaults unless files are explicitly
  exported; the MVP must not export them implicitly.
- A local process is a security boundary and must not become arbitrary shell
  execution.

### Recommendation

Use the local helper for the first faithful project-check MVP, restricted to
disk projects and fixed check IDs. Keep `check_file` as the universal,
browser-side syntax check. On OPFS/mobile, report project checks as
unavailable and offer `check_file`; do not pretend browser execution validates
the repository's actual Node/Yarn environment.

The browser runtime can be a later, narrowly scoped capability for checks whose
browser behavior and dependency cost are explicitly accepted. It is not the
MVP for faithful project checks, even though its permission surface is smaller.

## Security, approval, and privacy rules

### Approval

- Never run a project check silently.
- Require explicit approval for each invocation initially.
- Show check label, exact argv, working directory, timeout, network policy,
  and output destination before approval.
- Re-approve when project directory, check definition, or helper pairing
  changes.
- A skill may suggest a check but cannot approve it.

### Helper sandbox

- Accept only a known check ID; resolve it to fixed argv.
- Invoke without a shell and reject shell metacharacters/command substitution.
- Restrict cwd to the approved project root.
- Remove unnecessary environment variables and never pass AI credentials,
  private-note contents, or the full conversation.
- Disable network where the host OS permits it; describe this as best effort
  unless the helper has a real OS-enforced sandbox.
- MVP checks must not modify files.

### Output, timeout, and cancellation

- Stream visible progress and label it as local-process output.
- Cap total and per-line output.
- Redact token/API-key patterns before display or model transmission.
- Return only bounded stdout/stderr, exit code, duration, and
  cancelled/timed-out status.
- Do not write output to vault files or persist it in the thread by default.
- Use a bounded default timeout, initially 120 seconds.
- Use `AbortController` in the browser; the helper terminates the process
  group, waits briefly, then force-terminates if needed.
- `/plan`, Stop, New Chat, route disconnect, and helper disconnect cancel
  pending checks.
- Serialize or explicitly queue checks; never allow unbounded concurrency.

### Privacy

- Preserve existing private-note filtering.
- Project checks read local project files only through the helper; contents are
  not automatically sent to the model.
- The model receives summarized, bounded diagnostics only.
- No telemetry or cloud execution.

## Tests

All tests use Vitest with mocked hooks, network, file-system APIs, and Jotai
`Provider` state. No test may run a real helper process or external API.

1. Skill parser: valid/invalid frontmatter, allowlists, collisions, and plain
   text bodies.
2. Wizard: create/edit, validation, no writes on failure, and disk-wins save
   behavior.
3. Tool policy: approved bindings only; ordinary companion behavior unchanged;
   planning excludes mutating and execution tools.
4. Helper client: approval, check ID/argv, no arbitrary command, timeout,
   abort, output caps, redaction, and disconnect.
5. Tool runner: no vault, OPFS/browser, disk helper, mobile, and private-note
   cases.
6. Route: planning omission for `run_project_check`; helper execution remains
   outside the Next.js route.

## Incremental rollout

1. Add pure skill metadata parsing/validation and focused tests.
2. Add the create/edit wizard using existing file-system and note-buffer
   write paths.
3. Add declarative tool bindings and enforce them for slash-activated skills.
4. Add the fixed project-check catalog and model contract; return
   “helper unavailable” until pairing exists.
5. Add disk-only helper pairing, approval, bounded output, timeout, and
   cancellation.
6. Add OPFS/mobile unavailable-state UX with syntax-check fallback.
7. Consider browser-native checks later only after dependency/runtime costs and
   isolation guarantees are accepted.

## Decisions (resolved)

1. **Skill bindings:** Hard restrictions apply only for slash-activated skills. A model-loaded skill provides instructions only — the model tool schema cannot safely change mid-turn.
2. **Wizard entry:** Launched from AI settings, plus an optional `/skill` shortcut. AI settings is the primary entry; the shortcut is convenience only.
3. **Fixed check IDs / argv (first release):** `typecheck` and `unit-tests` only. `lint` is deferred until product explicitly requires it. Each ID maps to a fixed, shell-free `argv` in `app/services/project-checks.ts`; no user-authored commands in v1.
4. **Project-root pairing:** The helper requires explicit user selection/pairing of a local project directory. Browser vault handles do not expose a filesystem path, so the web app never infers the path; no implicit export of OPFS files.
5. **Desktop platforms:** Helper targets macOS, Windows, and Linux (disk vaults only). OPFS/mobile report project checks as unavailable with `check_file` fallback.
6. **“No network”:** Documented as best effort unless the host OS provides a real enforced sandbox. Copy must not claim an OS-enforced guarantee by default.
7. **Approval scope:** Per-invocation approval. Re-approve when project directory, check definition, or helper pairing changes; a skill may suggest a check but can never approve it.
8. **Helper packaging:** Shipped in this repository under `helper/` for the MVP (keeps catalog and protocol in sync); extract to a separate package/repository later if needed.
9. **Read-only checks:** Yes — project checks are read-only in the first release and must not modify vault or project files.
10. **GitHub workspace:** No live GitHub workspace execution path in v1. Legacy GitHub vaults follow the same browser-vault/OPFS unavailable behavior.
