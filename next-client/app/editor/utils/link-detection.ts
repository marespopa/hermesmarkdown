import { REGEX_MD_FILE_LINK, REGEX_MD_LINK, REGEX_WIKILINK } from "../components/regex";

export type LinkType = "url" | "file" | "wiki";

// `[label](target)` links: web addresses ("url") and vault paths ("file").
function findMarkdownLink(text: string, pos: number, regex: RegExp, type: LinkType) {
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    if (pos >= match.index && pos <= match.index + match[0].length) {
      const label = match[0].slice(1, match[0].indexOf("]"));
      return {
        type,
        // Unescaped, as the browser (or the vault lookup) should read it.
        value: match[1].replace(/\\(.)/g, "$1"),
        label,
        start: match.index,
        end: match.index + match[0].length,
        rawString: match[0],
      };
    }
  }
  return null;
}

export function findLinkAtPos(text: string, pos: number) {
  const markdown = findMarkdownLink(text, pos, REGEX_MD_LINK, "url") ?? findMarkdownLink(text, pos, REGEX_MD_FILE_LINK, "file");
  if (markdown) return markdown;

  let match;
  REGEX_WIKILINK.lastIndex = 0;
  while ((match = REGEX_WIKILINK.exec(text)) !== null) {
    if (pos >= match.index && pos <= match.index + match[0].length) {
      return {
        type: "wiki" as const,
        value: match[1],
        label: "",
        start: match.index,
        end: match.index + match[0].length,
        rawString: match[0],
      };
    }
  }
  return null;
}
