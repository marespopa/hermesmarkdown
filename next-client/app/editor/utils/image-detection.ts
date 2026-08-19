import { REGEX_MD_IMAGE } from "../components/regex";

export interface ImageMatch {
  src: string;
  alt: string;
  start: number;
  end: number;
}

export function findImageAtPos(text: string, pos: number): ImageMatch | null {
  REGEX_MD_IMAGE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = REGEX_MD_IMAGE.exec(text)) !== null) {
    if (pos >= match.index && pos <= match.index + match[0].length) {
      const altEnd = match[0].indexOf("]");
      return {
        src: match[1],
        alt: match[0].slice(2, altEnd),
        start: match.index,
        end: match.index + match[0].length,
      };
    }
  }
  return null;
}
