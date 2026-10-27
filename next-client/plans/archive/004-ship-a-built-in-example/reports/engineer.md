# Engineer report: built-in Project folder template

**Built:** content in `app/utils/templates/template-folders.ts`; nested writes in `use-template-packs.ts` (writeBuiltinPack); `displayName` on `BuiltinPack`; card title/aria in `BuiltinPackCard.tsx`; Folder templates section in `app/editor/templates/page.tsx`.

**Tests/docs:** `template-folders.test.ts` (new), `use-template-packs.test.ts`, `page.test.tsx`; BuiltinPackCard.md, templates README, utils/templates README, user docs `templates.tsx`.

**Decisions:** the top folder name comes from the template folder name (`{{prompt:Project name}}`), per folder-template.ts. The `:` in that on-disk name is fine on OPFS/POSIX but may be rejected by Windows file systems. Reused BuiltinPackCard and addBuiltinPack (in-flight key by id). Card region aria-label is "Project folder folder template".

**Not done:** nothing deferred.

**To verify:** `corepack yarn vitest run app/utils/templates/template-folders.test.ts app/hooks/file-system/use-template-packs.test.ts app/editor/templates/page.test.tsx`; `corepack yarn tsc --noEmit`.
