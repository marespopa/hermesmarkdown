import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightCode } from "@lezer/highlight";
import { markdownHighlightStyle } from "../codemirror/theme";

// Fills `target` with `code` coloured like the editor's own code blocks: the
// language is picked from the file name (`auth.ts` → TypeScript) and loaded
// on first use. Leaves the plain text in place when no language matches or
// loading fails. Resolves once done.
export async function highlightInto(target: HTMLElement, code: string, fileName: string): Promise<void> {
  const description = LanguageDescription.matchFilename(languages, fileName);
  if (!description) return;
  let support;
  try {
    support = await description.load();
  } catch {
    return;
  }
  const tree = support.language.parser.parse(code);
  const fragment = document.createDocumentFragment();
  highlightCode(
    code,
    tree,
    markdownHighlightStyle,
    (text, classes) => {
      if (!classes) {
        fragment.append(text);
        return;
      }
      const span = document.createElement("span");
      span.className = classes;
      span.textContent = text;
      fragment.append(span);
    },
    () => fragment.append("\n"),
  );
  target.replaceChildren(fragment);
}
