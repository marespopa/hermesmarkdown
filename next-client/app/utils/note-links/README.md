# note-links

Pure helpers for `[[wikilinks]]`.

| File | Purpose |
|---|---|
| `wikilink-scan.ts` | `parseLinkTarget`, `scanWikiLinks` (links and embeds with offsets, skipping fenced and inline code), `lineColumnAt`. |
| `link-resolver.ts` | `createLinkResolver`: map-based resolver with the rules of `resolveFileMetaByName` (exact path, relative, nearest basename). |
| `backlinks.ts` | `buildBacklinkIndex`: target path → notes linking to it. |
| `rewrite-links.ts` | `mapMovedPath`, `findRewriteCandidates`, `rewriteLinksInText`: rewrite only links that would stop resolving to the same note after a rename or move. |
