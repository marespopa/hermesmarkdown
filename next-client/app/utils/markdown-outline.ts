// A note's outline: its H1–H3 ATX headings in order, with the 1-based line
// each starts on (for jumping there). Headings inside fenced code blocks
// and the frontmatter don't count.

// What a code file's outline row is (its icon); a note's headings have none.
export type SymbolKind =
  | "module" | "class" | "struct" | "interface" | "enum" | "member" | "type"
  | "function" | "method" | "property" | "field" | "event" | "constant" | "variable" | "key" | "selector";

export interface OutlineHeading {
  level: 1 | 2 | 3;
  text: string;
  line: number;
  kind?: SymbolKind;
}

const HEADING = /^ {0,3}(#{1,3})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

export function extractOutline(content: string): OutlineHeading[] {
  const lines = content.split("\n");
  const headings: OutlineHeading[] = [];
  let index = 0;
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
    if (end > 0) index = end + 1;
  }
  let fence: string | null = null;
  for (; index < lines.length; index++) {
    const line = lines[index];
    const fenceMatch = FENCE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const match = HEADING.exec(line);
    if (match) headings.push({ level: match[1].length as 1 | 2 | 3, text: match[2], line: index + 1 });
  }
  return headings;
}
