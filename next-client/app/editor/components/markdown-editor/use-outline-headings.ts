"use client";

import { useEffect, useMemo, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { ensureSyntaxTree, syntaxTree, syntaxTreeAvailable } from "@codemirror/language";
import { extractOutline, type OutlineHeading } from "@/app/utils/markdown-outline";
import { extractCodeOutline } from "@/app/utils/code-outline";
import { extractCSharpOutline } from "@/app/utils/csharp-outline";

// After typing stops, before a code outline is read again.
const CODE_DELAY_MS = 200;
// Time the parser may take to finish the file before reading what's parsed.
const PARSE_BUDGET_MS = 25;
// While the parser is still working through a long file, read again.
const RETRY_MS = 400;
const MAX_RETRIES = 10;

const NONE: OutlineHeading[] = [];

const isCSharpPath = (path?: string | null) => !!path && /\.csx?$/i.test(path);

// The outline rows: a note's H1–H3 headings (extractOutline, from its
// text), or a code file's symbols (extractCodeOutline, from the editor's
// syntax tree; extractCSharpOutline, from a C# file's text, which has no
// tree), read a moment after typing stops, never blocking the editor for
// more than a few ms.
export function useOutlineHeadings(view: EditorView | null, text: string, isCode: boolean, filePath?: string | null): OutlineHeading[] {
  const isCSharp = isCode && isCSharpPath(filePath);
  const noteHeadings = useMemo(() => (isCode ? NONE : extractOutline(text)), [isCode, text]);
  const [codeHeadings, setCodeHeadings] = useState<OutlineHeading[]>(NONE);

  useEffect(() => {
    if (!isCSharp) return;
    const timer = setTimeout(() => setCodeHeadings(extractCSharpOutline(text)), CODE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCSharp, text]);

  useEffect(() => {
    if (!isCode || isCSharp || !view) return;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const read = () => {
      const state = view.state;
      const tree = ensureSyntaxTree(state, state.doc.length, PARSE_BUDGET_MS) ?? syntaxTree(state);
      setCodeHeadings(extractCodeOutline(tree, state.doc));
      if (!syntaxTreeAvailable(state, state.doc.length) && retries++ < MAX_RETRIES) timer = setTimeout(read, RETRY_MS);
    };
    timer = setTimeout(read, CODE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isCode, isCSharp, view, text]);

  return isCode ? codeHeadings : noteHeadings;
}
