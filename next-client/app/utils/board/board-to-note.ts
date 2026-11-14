import { FM_REGEX } from "../frontmatter-utils";
import { boardFenceRanges, parseBoard } from "./board-format";

const BOARD_KEYS = /^(?:hermes:\s*["']?board["']?|board-version:.*)\s*$/;

/** Whether the board holds a drawing (or one that can't be read): converting it loses something. */
export function boardHasDrawing(markdown: string): boolean {
  const parsed = parseBoard(markdown);
  return !parsed.ok || parsed.scene.elements.some((element) => !element.isDeleted);
}

/**
 * The board's file as a plain note: the drawing's fence and the board keys
 * are taken out, and everything else (other frontmatter, the text above and
 * below the drawing) stays. A board with nothing else becomes an empty note.
 */
export function boardToNote(markdown: string): string {
  let text = markdown;
  for (const [from, to] of boardFenceRanges(markdown).reverse()) text = text.slice(0, from) + text.slice(to);

  const frontmatter = FM_REGEX.exec(text);
  if (frontmatter && frontmatter.index === 0) {
    const kept = frontmatter[1].split("\n").filter((line) => !BOARD_KEYS.test(line));
    const rest = text.slice(frontmatter[0].length);
    text = kept.some((line) => line.trim()) ? `---\n${kept.join("\n")}\n---\n${rest}` : rest;
  }

  // The fence leaves its surrounding blank lines behind.
  const body = text.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").replace(/\s+$/, "");
  return body ? `${body}\n` : "";
}
