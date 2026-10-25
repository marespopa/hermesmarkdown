reviewer (Review 1): fix `FrontmatterHeaderMenus.test.tsx:87`. The expected caret must come from the post-edit doc (`view.state.doc.toString().indexOf("Body")`). The edit grows the doc by 1 char, so 22 is stale (got 23). The code is correct.

engineer: 001 built (header, status menu, date picker, initial caret). Likely CI failures: MarkdownEditor.test.tsx frontmatter case, frontmatter-header.test.ts (jsdom focus/Escape), FrontmatterHeaderMenus.test.tsx (date picker text).
engineer (fix round 1): test line 87 now uses the post-edit doc for the expected caret; no code change. Risk: same jsdom focus case.
