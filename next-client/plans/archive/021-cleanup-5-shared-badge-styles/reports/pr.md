## Shared tag pill and layout timing cleanup

- Every tag chip (editor, frontmatter, Tasks rows, Files/Tasks search chips and suggestions, palette `#` results) is now the same `TagPill`; search chips show `#tag` and lose the coloured dot.
- The Files page summary and token dialog use `formatCount` (separators, singular units).
- Dialogs, the mobile menu sheet, library chevrons and the pane title inset run on the shared layout timing with reduced-motion support; overlay duration tokens now alias `--layout-duration`.
- `theme.ts` keeps only editor-specific `.cm-tag-pill` rules; the look comes from `tagPillClass` utilities.
