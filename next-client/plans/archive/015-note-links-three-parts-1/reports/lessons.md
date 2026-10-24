# Lessons: plan 015 (note links, three parts)

Run history (usage.tsv): architect → engineer → review (changes-requested) → engineer fix round → review (approve with nits). One fix round, no failed runs, no RESUME notes. The whole round was caused by one thing: the engineer skipped part of the PRD's Tests section.

## 1. Engineer: the PRD's Tests list is part of "done"

- **Target:** `.claude/agents/hermes-engineer.md`, section "Tests and docs (same change)". Append this bullet:

  > - The PRD's Tests section is a checklist, not a suggestion. Write every listed test file and case before setting `state: review` (factory) or reporting. Never defer tests "for time". If a case can't be written, say why under "Not done / open" and in the mailbox handoff.

- **Evidence:**
  - `reports/engineer.md`: "Not written (time): `UnlinkedMentionsSection.test.tsx`, `WorkspaceSidebar.test.tsx` additions, `content-search(.client).test.ts` additions, rename/move hook tests."
  - The mailbox says "some secondary tests not written", yet the engineer still moved the plan to review.
  - Review 1: "Major: PRD-listed tests are missing."
  - The fix list covered six test items and no source changes.
- **Why it applies beyond this plan:** the existing rule says "add tests for every behavior change", but it names no consequence for skipping. Any large multi-phase PRD invites the same shortcut. The fix round cost about $0.85 and two extra runs.

## 2. Orchestrator stage prompt: block `review` while "Not done" lists missing tests

- **Target:** `scripts/factory`, the `specced|building|changes-requested` engineer prompt (line 174). Insert before "Otherwise set state: review":

  > Before setting state: review, compare the PRD's Tests section with the test files you wrote; if any listed file or case is missing, write it first.

- **Evidence:** the same lines as proposal 1. The engineer wrote a handoff admitting the gap and still set state to review, because nothing in the stage prompt linked the handoff to the exit condition.
- **Why it applies beyond this plan:** the stage prompt is what the engineer actually reads in factory mode. A rule that lives only in the agent file is easy to miss under a long PRD.

## 3. Reviewer: read newly added tests when a fix list was about tests

- **Target:** `.claude/agents/hermes-review.md`, in the Factory mode bullets, after "You may run a single test file…". Add:

  > When the previous fix list asked for tests, open each new test and check it asserts the PRD's listed cases and doesn't only exist. A matching filename isn't confirmation. Run a new test file if a case looks fragile, such as patched handles or fake timers.

- **Evidence:**
  - Review 2: "I did not run these tests and did not read them line by line. The consolidated `note-links.test.ts` is 131 lines, so it is small for the pure-core cases the PRD lists. CI will show whether they pass."
  - Engineer run 2: "The move test patches `resolve()` onto the in-memory vault handle, which may need adjusting."
  - The reviewer approved a round that existed only for tests without reading those tests. It also noted the suspicious file size and did not follow it up.
- **Why it applies beyond this plan:** in factory mode both the engineer and the reviewer skip running tests, so a fix round for tests has no check at all until CI on the release PR. The only available check is reading them.

## 4. Engineer: a deliberate deviation from the PRD wording goes in the mailbox handoff

- **Target:** `.claude/agents/hermes-engineer.md`, section "Report back", under **Decisions**. Replace "**Decisions:** gaps you filled and why." with:

  > - **Decisions:** gaps you filled and why. If you did something different from what the PRD says, even for a good reason, start the line with "Deviation:" and give the PRD section. Repeat it in the mailbox handoff in factory mode.

- **Evidence:**
  - `reports/engineer.md`: "Mention phrases use file base name + `frontmatter.title` (not the display title, which may be masked for private notes)."
  - The PRD says "display title (`noteDisplayTitle` / `frontmatter.title`)".
  - Review 2 only found this as a minor nit: "A note whose title comes from its H1 only is searched by file name alone."
  - The reasoning (privacy masking) was sound but sat in a report the reviewer had to cross-read, not in the handoff.
- **Why it applies beyond this plan:** engineers fill PRD gaps often. Marking deviations lets the reviewer judge them directly and tells the architect whether the PRD was wrong.

## 5. Engineer: when nothing is run, list the fragile assumptions in the handoff line

- **Target:** `.claude/agents/hermes-engineer.md`, "Factory mode", the handoff bullet. Append:

  > Because nothing is run, name in the handoff the one or two places most likely to fail in CI (patched test doubles, new mocks of shared hooks, existing tests that now render a changed hook).

- **Evidence:**
  - `reports/engineer.md`: "existing tests that render rename/move hooks may need `use-rewrite-links` mocked."
  - Run 2: "may need adjusting."
  - The final mailbox handoff, "review-1 fix list done (tests only); nothing run", carries none of that.
  - The caveats are in the report but not in the mailbox, which is the file the next stage reads first.
- **Why it applies beyond this plan:** CI is the first real run. A named risk lets the human or the CI-fix stage go straight to it.

## One-off corrections (no rule change)

- **Missing H1-title phrase for unlinked mentions (Review 2 minor):** a feature-specific gap between PRD wording and implementation. Proposal 4 covers the process part.
- **`content-mentions.ts` and `content-search.ts` import each other:** a design choice noted by the engineer and not flagged by the reviewer. It's specific to this code.
- **`MAX_OCCURRENCES_PER_NOTE` cap and the metadata-dependent debounce effect:** the reviewer confirmed both match the PRD. There was nothing to correct.
- **Pure-core tests consolidated into one `note-links.test.ts` instead of the four PRD files:** the reviewer accepted it, and the cases are what matter. I'm not proposing a file-per-module rule.
