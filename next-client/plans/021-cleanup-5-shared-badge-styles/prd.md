# Cleanup: shared badge styles and layout timing — engineering PRD

## Context

Source: [brief.md](brief.md). Two cleanups. (5) Every count and every tag pill in the library (the left panel: Open Notes, Outline, Files tree), the command palette and the editor should share one component/style. (6) Layout motion should run on the shared `duration-layout ease-layout` tokens (`--layout-duration: 150ms`). Non-layout animations stay as they are. Follow the flat minimal token rules: CSS vars → Tailwind tokens, no hard-coded colours, no glass on new surfaces.

What exists:

1. **Counts.** `app/components/CountBadge/CountBadge.tsx` is the shared count (`INLINE_CLASS`/`FLOATING_CLASS`, `formatCount(count, unit?)` with `en-US` separators). Used by `WordCountPill.tsx:50`, `TasksToolbar.tsx:87,125`, `TaskSection.tsx:37` (also the Tasks board via `TaskBoard.tsx:59`), `app/editor/tags/page.tsx:90`.
2. **No counts exist in the file tree or the palette.** Audit results: `VaultFileTree.tsx`, `vault-tree/FolderRow.tsx`, `vault-tree/FileRow.tsx`, `sidebar/SidebarFiles.tsx`, `SidebarOpenNotes.tsx`, `SidebarOutline.tsx`, `LinkedFromSection.tsx`, `SidebarSection.tsx`, `CommandPalette.tsx`, `PaletteRow.tsx` and `palette-model.tsx` render no numeric count. So nothing there needs converting (see Decisions D1).
3. **Counts that skip the shared formatting:**
   - `app/editor/files/page.tsx:136-138` builds `"N notes, M folders"` / `"N matching notes"` by hand, with no thousands separator.
   - `app/editor/components/TokenCostDialog.tsx:28` calls `inputTokens.toLocaleString("en-US")` + `" tokens"` by hand, with no singular form.
4. **Tag pills come in four looks:**
   - Editor: `.cm-tag-pill` / `-workflow` / `-custom` in `app/editor/codemirror/theme.ts:240-262`, applied by `tagPillClassName(kind)` in `app/editor/codemirror/tag-pills.ts:27`. The frontmatter chips reuse it (`frontmatter-fold.ts:89`). This is the reference look: rounded-full, `var(--border)` border, chrome background at 72%, 0.9em text, moss for workflow tags, `fg-muted` for custom ones.
   - Tasks rows: `app/editor/tasks/components/TaskRow.tsx:116-120` shows plain `text-ui-footnote text-sage` text (`#tag`).
   - Files/Tasks search chips: `app/editor/components/UnifiedSearchInput.tsx:215-238` use `bg-beige dark:bg-clay/80` with a `TagDot` (`:21-28`). `TagDot` hard-codes `bg-red-500` for `urgn`, and both of its other branches are `bg-sage`. The suggestion rows (`:266-268`) show `TagDot` + `#tag`.
   - Palette `#` scope: `palette-model.tsx:144` builds `detail` as plain text `"#a #b"`. `PaletteRow.tsx:32,96` renders it as `text-ui-footnote text-fg-muted` with match highlights.
5. **Dead tag colour map.** `TAG_COLORS` (`app/editor/components/constants.ts:7-12`) is referenced only by `TagDot`, and both branches give the same colour.
6. **Layout timing.** The tokens are defined at `app/globals.scss:83-87` and `tailwind.config.js:134-146` (`duration-layout`, `ease-layout`, and the separate `overlay-backdrop`/`overlay-panel`, both hard-coded `'150ms'`). These already use them: `WorkspaceSidebar.tsx:101`, `ShellPage.tsx:36,39`, `MarkdownEditor.tsx:269`, `editor.scss:127`, `app/editor/page.tsx:242` (the `left` part). These are stray:
   - `PaneLeaf.tsx:124`: `transition-all duration-layout ease-layout` on the pane root. No style on that element changes over time: the app has one `PaneLeaf` (`app/editor/page.tsx:285`, no splits), and the only style is a static CSS var, so `transition-all` animates nothing.
   - `PaneLeaf.tsx:158`: the title wrapper switches `pl-3`/`pl-12` when the library opens or closes. It jumps instantly, while the page beside it slides over 150ms. `ShellPage.tsx:39` animates the same padding with `transition-[padding] duration-layout ease-layout motion-reduce:transition-none`.
   - `DialogModal.tsx:44` (backdrop `duration-300`) and `:54` (panel `duration-500 ease-out`, a bottom sheet on mobile).
   - `Header/Navigation/MobileNavigationLinks.tsx:33` (`duration-300`) and `:36` (`duration-500 ease-out`), the mobile menu sheet.
   - Disclosure chevrons at `duration-150` without the layout curve: `sidebar/SidebarSection.tsx:88`, `sidebar/SidebarOutline.tsx:182`, `vault-tree/FolderRow.tsx:158` (FolderRow also lacks `motion-reduce`).

## Behavior

Counts:
- Every count the library, palette and editor show uses `CountBadge` (in a listing or bar) or `formatCount` (in a sentence): thousands separators, singular/plural units.
- The Files page summary reads `1,204 notes, 1 folder` / `1 matching note`. The token dialog reads `1 token` / `1,234 tokens`.
- No new counts appear anywhere. The file tree and the palette stay count-free.

Tag pills:
- A tag shows as the same pill everywhere it is a tag chip: in the editor (inline and in frontmatter), on Tasks rows, in the Files/Tasks search chips and suggestions, and in the palette's `#` scope results.
- The look is the current editor pill: rounded, hairline `edge` border, chrome background at 72%, text at 0.9em of the surrounding text. Workflow tags (`draft`, `review`, `active`, `archived`) are `sage`; others are `fg-muted`.
- The pill text is `#tag`. Palette pills keep the fuzzy-match highlights on the matched characters.
- A search chip keeps its × remove control inside the pill, with the same behaviour (mousedown removes, `aria-label="Remove <tag>"`). The coloured dot goes away; `urgn` gets no special red.
- The Tags page's left list (`tags/page.tsx:80-92`) is a navigation list of `#` + name + `CountBadge`, not a set of pills. It is unchanged.
- Dark mode and the colour palettes follow automatically, because the pill uses only CSS-var tokens.
- Mobile: the same pill. Task rows wrap their meta line as now (`flex-wrap`).

Timing:
- Opening or closing the library slides the page, and the pane title's left padding now moves with it at the same 150ms on `ease-layout`.
- Dialogs and the mobile menu sheet fade in over the overlay backdrop timing, slide in over the overlay panel timing, and use `ease-layout`. Both overlay timings now resolve to `--layout-duration` (still 150ms), so the palette, the shortcuts overlay and the docs sheet keep their current timing.
- Disclosure chevrons in the library and tree rotate on `duration-layout ease-layout`.
- `prefers-reduced-motion`: every changed layout transition carries `motion-reduce:transition-none`, and every animation `motion-reduce:animate-none`.
- Unchanged, by design: toasts, pulses (`animate-pulse`, the save dot), spinners, `LoadingOverlay` (500ms), `AIThinkingOverlay`, `WordCountPill`'s 300ms fade, the palette's empty-state fades (`CommandPalette.tsx:344,350`), `TaskRow`'s spring (`:87`), `highlight-inline.ts:13` `FADED`, the editor page's 500ms theme colour fade (`app/editor/page.tsx:242`, colour only), `Toggle`, `Input`/`Textarea`/`TaskDialog`/`SettingControls`/`DatePickerCallout`/`NavigationLink` control-state transitions, `FileRow.tsx:160` row colours, `PILL_CONTAINER_CLASSES` (`constants.ts:122`), and anything under `app/tools`, `app/documentation`, `LandingPage`.

## Design

### New `app/components/TagPill/`

A sibling of `CountBadge`, following its pattern: class constants in the component, a pure helper, an `index.ts` re-export.

```ts
// TagPill.tsx
export type TagKind = "workflow" | "custom";
export const TAG_PILL_CLASS =
  "inline-flex items-center whitespace-nowrap rounded-full border border-edge " +
  "bg-[color:color-mix(in_srgb,var(--chrome)_72%,transparent)] px-[0.45em] py-[0.1em] " +
  "text-[0.9em] font-normal leading-[1.2]";
const KIND_CLASS: Record<TagKind, string> = { workflow: "text-sage", custom: "text-fg-muted" };

export function tagKind(tag: string): TagKind;          // WORKFLOW_TAGS.includes(tag.replace(/^#/, "").toLowerCase())
export function tagPillClass(kind: TagKind): string;   // `${TAG_PILL_CLASS} ${KIND_CLASS[kind]}`

type Props = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
  tag: string;                 // without "#"
  label?: React.ReactNode;     // replaces the default `#${tag}` (palette highlights)
  trailing?: React.ReactNode;  // inside the pill after the label (search chip ×)
};
export default function TagPill({ tag, label, trailing, className = "", ...rest }: Props);
// <span {...rest} className={`${tagPillClass(tagKind(tag))} ${className}`}>{label ?? `#${tag}`}{trailing}</span>
```

- `WORKFLOW_TAGS` comes from `@/app/editor/components/constants`. `app/components` already imports from `app/editor` (`CommandPalette/AppCommands.tsx:7`).
- The arbitrary `bg-[color:color-mix(...)]` follows `EmptyNoteTemplates.tsx:27`. `border-edge` = `var(--border)`, `text-sage` = `var(--moss)`, `text-fg-muted` = `var(--fg-muted)` (`tailwind.config.js:61-90`). No hard-coded colour.
- **Size is em-relative** (0.9em), so the pill fits its context: editor text, footnote rows, caption chips. Callers set the font size on the parent, not on the pill. Tailwind class order doesn't settle conflicts.

### The editor uses the same classes

Tailwind scans `app/**/*.ts` (`tailwind.config.js:3-9`), so CodeMirror DOM can take utilities.
- `tag-pills.ts#tagPillClassName(kind)` returns `` `${tagPillClass(kind)} cm-tag-pill cm-tag-pill-${kind}` ``.
- `buildTagMatch` uses `tagKind(tagName)` instead of its own `WORKFLOW_TAGS.includes`.
- `theme.ts` keeps only editor-specific rules on `.cm-tag-pill`: `verticalAlign`, `margin`, `cursor`, `userSelect`, `transform`.
  - Remove `display`, `alignItems`, `borderRadius`, `border`, `backgroundColor`, `color`, `fontSize`, `lineHeight`, `padding`, `whiteSpace`, and delete the `-workflow`/`-custom` colour rules.
  - This step is required: CodeMirror's scoped theme selectors (`.ͼN .cm-tag-pill`) out-rank single-class utilities, so leftover duplicates would mask the shared style.
  - The scoped overrides that should win still win: `.cm-frontmatter-summary-keys .cm-frontmatter-chip` (`theme.ts:233`), `.cm-frontmatter-tag-list .cm-tag-pill` (`:302`), `.cm-tag-pill.cm-chip-editing` (`live-markers-theme.ts:158`).

Why one TS class constant rather than a global SCSS `.tag-pill` class: it follows the `CountBadge` pattern, keeps the style next to the component and testable from TS, and grows neither `globals.scss` (654 lines) nor `theme.ts` (489 lines), which are already over the size budget. `theme.ts` gets shorter.

### Palette tag highlights

Add to `palette-model.tsx`:

```ts
// Splits a `#` scope row's detail ("#a #bc") into its tags, with each match index made relative to that tag's "#tag" text.
export function splitTagDetail(detail: string, indices: number[]): { tag: string; indices: number[] }[];
```

`buildTagRows` (`:136-146`) is unchanged; its indices point into the joined string. `PaletteRow` renders each part as `<TagPill tag={part.tag} label={<HighlightedText text={`#${part.tag}`} indices={part.indices} />} />`.

### Timing tokens

`tailwind.config.js:135-136`: `'overlay-backdrop': 'var(--layout-duration)'` and `'overlay-panel': 'var(--layout-duration)'`. One source for the 150ms, and the existing users keep their timing. `tailwindcss-animate` reads `transitionDuration`/`transitionTimingFunction` for its `duration-*`/`ease-*` animation utilities; `CommandPalette.tsx:326` already pairs `animate-in` with `duration-overlay-panel`.

## Phase 1: Shared tag pill and count formatting

- `app/components/TagPill/TagPill.tsx`, `index.ts` (`export { default, TAG_PILL_CLASS, tagKind, tagPillClass } from "./TagPill"` plus `export type { TagKind }`), `TagPill.md`, `TagPill.test.tsx`: new, as in Design.
- `app/editor/codemirror/tag-pills.ts:27-38`: `tagPillClassName` composes `tagPillClass`; `buildTagMatch` uses `tagKind`. Keep the `TagMatch["kind"]` type, which is the same union as `TagKind`, or alias it.
- `app/editor/codemirror/theme.ts:240-262`: trim `.cm-tag-pill` to the editor-only props and delete the `.cm-tag-pill.cm-tag-pill-workflow`/`-custom` blocks. Update the comment to say the look lives in `TagPill`.
- `app/editor/tasks/components/TaskRow.tsx:111-121`: add `text-ui-footnote` to the meta wrapper `div` (`:112`) and replace the `<span className="text-ui-footnote text-sage">#{tag}</span>` map with `<TagPill key={tag} tag={tag} className="shrink-0" />`.
- `app/editor/components/UnifiedSearchInput.tsx`:
  - Delete `TagDot` (`:21-28`) and the `TAG_COLORS` import (`:5`; keep `WORKFLOW_TAGS`).
  - Chips (`:216-238`): each chip becomes `<TagPill key={token} tag={token} className="shrink-0 gap-1 pr-[0.25em]" trailing={<Button variant="unstyled" … className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-fg-faint hover:text-fg transition-colors" aria-label={`Remove ${token}`}><HiX size={8} /></Button>} />`, keeping the `onMouseDown` and `tabIndex={-1}` handlers.
  - Add `text-ui-caption` to the chip row wrapper (`:214`).
  - Suggestions (`:266-268`): replace `<TagDot/>` + `<span>#{tag}</span>` with `<TagPill tag={tag} />`, and keep the `workflow` label.
- `app/editor/components/constants.ts:7-12`: delete `TAG_COLORS` (no other references; `grep -rn TAG_COLORS app` to confirm).
- `app/components/CommandPalette/palette-model.tsx`: add `splitTagDetail` (the file is ~218 lines and stays under 400).
- `app/components/CommandPalette/PaletteRow.tsx:29-34,96`:
  - `resultContext` stays as is, since it feeds `accessibleLabel` (`:73`).
  - In the render, when `row.kind === "file" && scope === "tag"`, render the context as `splitTagDetail(row.detail, row.detailIndices).map(...)` `TagPill`s with `ml-1` between them, inside the existing `ml-2 text-ui-footnote` span, instead of one `HighlightedText`. Other kinds are unchanged.
- `app/editor/files/page.tsx:136-138`: build the text with `formatCount` from `@/app/components/CountBadge`, for example `formatCount(totalResultsCount, ["matching note", "matching notes"])` and `` `${formatCount(allFiles.length, ["note", "notes"])}, ${formatCount(folderPaths.length, ["folder", "folders"])}` ``.
- `app/editor/components/TokenCostDialog.tsx:28`: `formatCount(inputTokens, ["token", "tokens"])`.

## Phase 2: Layout timing

- `tailwind.config.js:134-139`: point `overlay-backdrop` and `overlay-panel` to `'var(--layout-duration)'`. Rewrite the comments: one layout timing for the library, the content it pushes, the sheet, and the overlay sheets and drawers. Don't call it "sidebar".
- `app/components/DialogModal/DialogModal.tsx`:
  - `:44`: `"animate-in fade-in duration-overlay-backdrop motion-reduce:animate-none"`.
  - `:54`: `duration-500 ease-out` → `duration-overlay-panel ease-layout motion-reduce:animate-none`.
- `app/components/Header/Navigation/MobileNavigationLinks.tsx`:
  - `:33`: `duration-300` → `duration-overlay-backdrop motion-reduce:animate-none`.
  - `:36`: `duration-500 ease-out` → `duration-overlay-panel ease-layout motion-reduce:animate-none`.
- `app/editor/components/PaneLeaf.tsx`:
  - `:124`: remove `transition-all duration-layout ease-layout`.
  - `:158`: add `transition-[padding] duration-layout ease-layout motion-reduce:transition-none` to the title wrapper's className.
- `app/editor/components/sidebar/SidebarSection.tsx:88` and `sidebar/SidebarOutline.tsx:182`: `duration-150` → `duration-layout ease-layout`, keeping `motion-reduce:transition-none`.
- `app/editor/components/vault-tree/FolderRow.tsx:158`: `duration-150` → `duration-layout ease-layout motion-reduce:transition-none`.
- `app/globals.scss:83-85`: the comment already lists drawers and sheets. Only replace "sidebar" with "library" in that comment (no new lines).
- Don't touch anything in the "Unchanged, by design" list (Behavior).

## Tests

Fully mocked, Jotai `<Provider>` where a component reads atoms, `next/navigation` `useRouter` mocked where the existing suites do.

Phase 1:
- `app/components/TagPill/TagPill.test.tsx` (new):
  - `tagKind("review")` → `workflow`, `tagKind("#Draft")` → `workflow`, `tagKind("idea")` → `custom`.
  - It renders `#idea` by default.
  - `label` replaces the text.
  - `trailing` renders inside the pill: `getByText("#idea")` and the trailing button share a parent span.
  - It passes `role`/`aria-*` through.
- `app/editor/codemirror/tag-pills.test.ts:86`: build the expected class with `tagPillClassName("custom")` (`` `#project/subtag ${tagPillClassName("custom")} cm-chip-editing` ``) instead of the literal string. `:39` (`.cm-tag-pill` query) still passes.
- `app/components/CommandPalette/palette-model.test.ts`: `splitTagDetail("#a #bc", [1, 4, 5])` → `[{ tag: "a", indices: [1] }, { tag: "bc", indices: [1, 2] }]`. Also check the round trip through `buildTagRows` for a two-tag query (each part's indices land on matched characters of its own tag).
- `app/components/CommandPalette/CommandPalette.test.tsx` (existing `#` scope test, if present; otherwise add one): a `#` query shows each matched tag as its own element with text `#tag`, and the row's accessible name still contains `#tag`.
- `app/editor/tasks/components/TaskRow.test.tsx`: a task with tags renders `#tag` text for each tag (behavioural; no class asserts).
- `app/editor/files/page.test.tsx`: with 1,204 mocked files and 1 folder (or a smaller pair: 1 note, 2 folders) the summary reads `1,204 notes, 1 folder`. With a filter and 1 result it reads `1 matching note`.
- `app/editor/components/TokenCostDialog.test.tsx:41` still passes (`1,234 tokens`); add `1 token`.
- `UnifiedSearchInput` (via `app/editor/files/page.test.tsx` or a new `UnifiedSearchInput.test.tsx`): a selected tag shows `#tag` (new: previously the chip showed the bare name), and mousedown on `Remove <tag>` calls `onTokenRemove(tag)`.

Phase 2: no behaviour to assert (class-only timing changes). Existing `PaneLeaf.test.tsx`, `DialogModal` users and `WorkspaceSidebar.test.tsx` must keep passing. Add no CSS-class tests (AGENT_RULES: behaviour, not CSS).

## Docs

- `app/components/TagPill/TagPill.md` (new): purpose, props table, `tagKind`/`tagPillClass`/`TAG_PILL_CLASS`, em-relative sizing, used by the editor (`tag-pills.ts`, `frontmatter-fold.ts`), `TaskRow`, `UnifiedSearchInput`, `PaletteRow`.
- `app/components/README.md`: add a `TagPill` row next to `CountBadge`.
- `app/components/CountBadge/CountBadge.md`: in the intro, replace "the sidebar" with the real users. Under "Used by", add `formatCount` callers: the Files page summary and `TokenCostDialog`.
- `app/editor/components/UnifiedSearchInput.md`: Dependencies become `constants` (`WORKFLOW_TAGS`), `TagPill`, `Button`; describe chips as tag pills with an inner ×.
- `app/editor/tasks/components/TaskRow.md`: tags render as `TagPill`s.
- `app/components/CommandPalette/PaletteRow.md` and `CommandPalette.md` (the `#` scope section): matched tags shown as pills with highlights; mention `splitTagDetail` in the palette-model notes if they list helpers.
- `app/editor/codemirror/README.md` (the tag-pills entry), if it describes the pill look: point it to `TagPill`.
- `app/editor/components/PaneLeaf.md`: the title's left inset animates with the library on the layout timing.
- `app/components/DialogModal/DialogModal.md`, if it states animation timings.
- `DESIGN.md` § Motion (`:192`): overlay backdrop/panel resolve to `--layout-duration`, and dialogs use them. § Counts (`:196`): tags share `TagPill` (the editor's pill look) across the editor, Tasks, search chips and the palette; `formatCount` for counts in sentences.
- In-app docs (`app/documentation/content/`): no change expected. `grep -rn "chip\|dot" app/documentation/content` for any mention of coloured tag dots and adjust it if found.

## Acceptance criteria

- [ ] `app/components/TagPill/` exists with `TagPill.tsx`, `index.ts`, `TagPill.md`, `TagPill.test.tsx`. It uses only token classes (no hex, no `red-*`/`neutral-*`).
- [ ] Editor inline tags and frontmatter chips get their look from `tagPillClass`; `theme.ts` no longer sets colour, border, background, radius, padding or font-size on `.cm-tag-pill`.
- [ ] Tasks rows, search chips and suggestions, and palette `#` results render tags with `TagPill`; palette matches stay highlighted.
- [ ] `TagDot` and `TAG_COLORS` are gone; `grep -rn "TAG_COLORS\|TagDot\|bg-red-500" app/editor/components/UnifiedSearchInput.tsx app/editor/components/constants.ts` is empty.
- [ ] The Files page summary and `TokenCostDialog` use `formatCount` (separators, singular/plural).
- [ ] No count was added to the file tree or the palette.
- [ ] `overlay-backdrop`/`overlay-panel` resolve to `var(--layout-duration)`.
- [ ] `DialogModal` and `MobileNavigationLinks` have no `duration-300`/`duration-500`, and they use `ease-layout` plus `motion-reduce:animate-none`.
- [ ] `PaneLeaf` has no `transition-all`, and its title inset animates with `duration-layout ease-layout motion-reduce:transition-none`.
- [ ] Library/tree chevrons use `duration-layout ease-layout` with `motion-reduce:transition-none`.
- [ ] Every item in the "Unchanged, by design" list is untouched.
- [ ] Tests listed above added/updated. Every touched source file stays under 400 lines (`theme.ts` and `globals.scss` don't grow).
- [ ] Docs listed above updated. No new code, comment or doc text says "sidebar" or "rail", except existing identifiers such as `WorkspaceSidebar` and `SidebarSection`.

## Decisions

- **D1: no new counts in the file tree or the palette.** The brief notes CountBadge isn't used there. The audit shows these surfaces have no counts to convert. Adding folder note counts or tag counts would be new UI, not cleanup, and it cuts against the quiet minimal direction. If they are wanted later, they use `CountBadge`.
- **D2: the editor's `.cm-tag-pill` look is the shared one.** DESIGN.md:196 already names it the tag look, and the frontmatter chips reuse it. The other three looks converge on it.
- **D3: drop the search-chip colour dot and the `urgn` red.** It hard-codes a colour against the token rules, and the other branches were identical. Workflow vs custom colour carries the only distinction, as in the editor.
- **D4: search chips show `#tag`** (previously the bare name), matching every other tag pill.
- **D5: overlay sheets and dialogs count as drawers.** `globals.scss:83-84` already lists "drawers and sheets" as layout motion. `DialogModal` is a bottom sheet on mobile, so its 300/500ms moves to the overlay tokens, which now alias `--layout-duration`. `AIThinkingOverlay` (a waiting state, like a spinner) and `LoadingOverlay` stay.
- **D6: "pane splits" no longer exist.** There is one `PaneLeaf`, so its `transition-all` is dropped rather than narrowed. A future split view takes `transition-[flex-basis] duration-layout ease-layout`.
- **D7: chevrons are on the layout timing.** The value stays 150ms, so it looks the same; they now use the same curve as the expand they announce.
- **D8: `FileRow.tsx:160` `transition-all duration-200` stays.** It animates row colour and selection state, not layout, so the brief keeps it as is.

## Out of scope / Deferred

- Restyling `UnifiedSearchInput`'s input, clear button or glass suggestion popover (`:252`) beyond the chips and suggestion rows.
- The Tags page list layout, the `ChatContextChips` file chips, `PrivateBadge`, the template field pills (`.cm-template-field`) and the date chips.
- `app/editor/components/SectionHeader.tsx` (`transition-all duration-200`): no importers found. Don't edit or delete it here; flag it for a dead-code pass.
- Any timing in `app/tools`, `app/documentation`, `LandingPage` or marketing pages, except `MobileNavigationLinks` (D5).
- Renaming `WorkspaceSidebar`/`Sidebar*` identifiers or `aria-label="Sidebar"`.

## Open questions

- Should folders in the file tree, or the library's Files section header, show a note count (`CountBadge`)? D1 assumes no.
- Is losing the red dot on `urgn` search chips acceptable? D3 assumes yes. If `urgn` should stand out, the token-safe way is a third `TagKind` using `text-danger`.
