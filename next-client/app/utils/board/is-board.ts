import { FM_REGEX } from "../frontmatter-utils";

const BOARD_KEY = /^hermes:\s*["']?board["']?\s*$/m;

/** A board has `hermes: board` frontmatter, or is an empty `.board.md` file. */
export function isBoard(path: string, content: string): boolean {
  if (path === "draft") return false;
  const fm = FM_REGEX.exec(content);
  if (fm && BOARD_KEY.test(fm[1])) return true;
  return path.endsWith(".board.md") && content.trim() === "";
}
