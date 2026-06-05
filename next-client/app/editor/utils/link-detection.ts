import { REGEX_MD_LINK, REGEX_WIKILINK } from "../components/regex";

export function findLinkAtPos(text: string, pos: number) {
  let match;
  REGEX_MD_LINK.lastIndex = 0;
  while ((match = REGEX_MD_LINK.exec(text)) !== null) {
    if (pos >= match.index && pos <= match.index + match[0].length) {
      const label = match[0].slice(1, match[0].indexOf("]"));
      return { type: "url", value: match[1], label, start: match.index, end: match.index + match[0].length };
    }
  }

  REGEX_WIKILINK.lastIndex = 0;
  while ((match = REGEX_WIKILINK.exec(text)) !== null) {
    if (pos >= match.index && pos <= match.index + match[0].length) {
      return { type: "wiki", value: match[1], start: match.index, end: match.index + match[0].length };
    }
  }
  return null;
}
