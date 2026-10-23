# note-links

Pure helpers for `[[wikilinks]]` and Markdown links to vault files.

| File | Purpose |
|---|---|
| `wikilink-scan.ts` | `parseLinkTarget`, `scanWikiLinks` (links and embeds with offsets, skipping fenced and inline code), `lineColumnAt`. |
| `link-resolver.ts` | `createLinkResolver`: map-based resolver with the rules of `resolveFileMetaByName` (exact path, relative, nearest basename). |
| `file-link.ts` | `fileLinkPath` (a Markdown link's href → vault path, from the linking note's folder: `./`, `../`, leading `/` = vault root, `#heading`/`?query` dropped, escapes decoded; null when it leaves the vault), `resolveFileLink` (exact path, any case, then with `.md` added). |
| `backlinks.ts` | `buildBacklinkIndex`: target path → notes linking to it. |
| `rewrite-links.ts` | `mapMovedPath`, `findRewriteCandidates`, `rewriteLinksInText`: rewrite only links that would stop resolving to the same note after a rename or move. |
