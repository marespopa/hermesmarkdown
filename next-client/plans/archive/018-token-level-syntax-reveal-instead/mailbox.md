engineer: token-level reveal done in syntax-reveal.ts; likeliest CI risks: syntax-reveal.test.ts expectations (multi-line/nested parse) and bench signature.

engineer: fix round 1 — syntax-reveal.test.ts caret now doc.indexOf("it_")+1; nothing else changed.

## Review 1 fix list
1. syntax-reveal.test.ts:36: doc.indexOf("it,") is -1 (the doc has `_it_,`), so the caret lands at 0 and the test fails. Use doc.indexOf("it_") + 1 so the caret is inside `it`. Re-run the file.
