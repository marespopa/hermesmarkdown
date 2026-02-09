"use client";

import { useMemo, useRef, useState } from "react";

const PROMPT_TEMPLATES = [
  {
    key: "/structure",
    label: "Prompt structure",
    template: "## Role\n\n## Context\n\n## Task\n\n## Constraints\n\n## Output format\n\n",
  },
  {
    key: "/summarize",
    label: "Summarize",
    template: "## Task\nSummarize the content.\n\n## Output format\n- Bullet points\n- <= 8 bullets\n\n",
  },
  {
    key: "/rewrite",
    label: "Rewrite",
    template: "## Task\nRewrite for {audience}.\n\n## Tone\n{tone}\n\n## Keep\n{must-keep}\n\n",
  },
  {
    key: "/extract",
    label: "Extract action items",
    template: "## Task\nExtract action items.\n\n## Output format\n- [ ] Action item\n- Owner: {name}\n\n",
  },
  {
    key: "/outline",
    label: "Outline",
    template: "## Task\nCreate an outline.\n\n## Depth\n{h2|h3}\n\n## Format\nMarkdown headings\n\n",
  },
  {
    key: "/compare",
    label: "Compare",
    template: "## Task\nCompare A vs B.\n\n## Criteria\n- {list}\n\n## Output format\n| Criteria | A | B |\n| --- | --- | --- |\n\n",
  },
  {
    key: "/translate",
    label: "Translate",
    template: "## Task\nTranslate to {language}.\n\n## Preserve\n- Names\n- Code\n- Terms\n\n",
  },
  {
    key: "/fix",
    label: "Fix grammar",
    template: "## Task\nFix grammar and clarity.\n\n## Constraints\n- Keep meaning\n\n",
  },
  {
    key: "/idea",
    label: "Brainstorm",
    template: "## Task\nGenerate {n} ideas.\n\n## Constraints\n{constraints}\n\n## Output format\n1.\n2.\n3.\n\n",
  },
  {
    key: "/todo",
    label: "Turn into tasks",
    template: "## Task\nTurn this into tasks.\n\n## Output format\n- [ ] Task\n- Owner: {name}\n- Due: {date}\n\n",
  },
  {
    key: "/critique",
    label: "Critique",
    template: "## Task\nCritique the content.\n\n## Focus\n- Clarity\n- Logic\n- Gaps\n\n## Output format\n- Issue\n- Why it matters\n- Suggested fix\n\n",
  },
  {
    key: "/qa",
    label: "Q&A",
    template: "## Task\nGenerate Q&A.\n\n## Output format\nQ: {question}\nA: {answer}\n\n",
  },
  {
    key: "/meeting",
    label: "Meeting summary",
    template: "## Task\nSummarize the meeting.\n\n## Output format\n- Decisions\n- Action items\n- Open questions\n\n",
  },
  {
    key: "/explain",
    label: "Explain",
    template: "## Task\nExplain this for {audience}.\n\n## Output format\n- Plain language\n- Example\n- Key takeaway\n\n",
  },
  {
    key: "/steps",
    label: "Step-by-step",
    template: "## Task\nCreate step-by-step instructions.\n\n## Output format\n1.\n2.\n3.\n\n",
  },
  {
    key: "/email",
    label: "Write email",
    template: "## Task\nDraft an email.\n\n## Audience\n{recipient}\n\n## Tone\n{tone}\n\n## Output format\nSubject: {subject}\n\nBody:\n",
  },
  {
    key: "/spec",
    label: "Spec outline",
    template: "## Task\nCreate a spec outline.\n\n## Output format\n- Goal\n- Non-goals\n- Requirements\n- Constraints\n- Open questions\n\n",
  },
  {
    key: "/test",
    label: "Test cases",
    template: "## Task\nGenerate test cases.\n\n## Output format\n- Scenario\n- Steps\n- Expected result\n\n",
  },
  {
    key: "/sql",
    label: "SQL help",
    template: "## Task\nWrite SQL for {goal}.\n\n## Tables\n- {table}: {columns}\n\n## Output format\n```sql\nSELECT ...\n```\n\n",
  },
  {
    key: "/code",
    label: "Code help",
    template: "## Task\nWrite code for {goal}.\n\n## Constraints\n- Language: {language}\n- Style: {style}\n\n## Output format\n```{language}\n...\n```\n\n",
  },
  {
    key: "/rubric",
    label: "Scoring rubric",
    template: "## Task\nCreate a scoring rubric.\n\n## Criteria\n- {criterion}: {weight}\n\n## Output format\n- Score 1-5 with descriptors\n\n",
  },
];

type Props = {
  contentEdited: string;
  isCompact?: boolean;
  onInsertTemplate?: (template: string) => void;
};

type AutocompleteItem = {
  key: string;
  label: string;
  template: string;
};

export default function PromptBar({ contentEdited, isCompact = false, onInsertTemplate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autocompleteItems = useMemo(() => {
    const cursor = textareaRef.current?.selectionStart ?? prompt.length;
    const lineStart = prompt.lastIndexOf("\n", cursor - 1);
    const tokenStart = prompt.lastIndexOf("/", cursor - 1);
    const isTokenValid = tokenStart > lineStart;
    const token = isTokenValid ? prompt.slice(tokenStart, cursor).toLowerCase() : "";
    const templateItems: AutocompleteItem[] = PROMPT_TEMPLATES.map((entry) => ({
      key: entry.key,
      label: `${entry.key} - ${entry.label}`,
      template: entry.template,
    }));
    const filtered = templateItems.filter((entry) =>
      token.length === 0 ? true : entry.label.toLowerCase().includes(token)
    );
    return {
      items: filtered,
    };
  }, [prompt]);

  const applyTemplate = (template: string) => {
    if (onInsertTemplate) {
      onInsertTemplate(template);
      setPrompt("");
    } else {
      setPrompt(template);
    }
    setActiveIndex(0);
  };

  return (
    <div className={`w-full ${isCompact ? "" : "max-w-xl"}`}>
      <div className="relative flex justify-center">
        <textarea
          ref={textareaRef}
          rows={1}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Tab" && autocompleteItems.items.length > 0) {
              event.preventDefault();
              const item = autocompleteItems.items[Math.min(activeIndex, autocompleteItems.items.length - 1)];
              applyTemplate(item.template);
              return;
            }

            if (autocompleteItems.items.length > 0) {
              if (event.key === "ArrowDown") {
                setActiveIndex((prev) => Math.min(prev + 1, autocompleteItems.items.length - 1));
              }
              if (event.key === "ArrowUp") {
                setActiveIndex((prev) => Math.max(prev - 1, 0));
              }
            }
            if (event.key === "Enter" && autocompleteItems.items.length > 0 && !event.shiftKey) {
              event.preventDefault();
              const item = autocompleteItems.items[Math.min(activeIndex, autocompleteItems.items.length - 1)];
              applyTemplate(item.template);
            }
          }}
          placeholder="Start a prompt"
          className="w-full rounded-lg px-5 py-3 text-base leading-tight transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none select-none border bg-white text-black border-black shadow hover:bg-amber-50 focus-visible:ring-black dark:bg-neutral-700 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-800 dark:focus-visible:ring-white placeholder-neutral-500 dark:placeholder-neutral-600 resize-none"
          aria-label="Prompt autocomplete"
        />
        {isFocused && autocompleteItems.items.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-2 z-20">
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 px-2 pb-1">
              Autocomplete
            </div>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {autocompleteItems.items.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyTemplate(item.template);
                  }}
                  className={`w-full text-left rounded-xl px-3 py-2 text-sm transition ${index === activeIndex ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {item.template.replace(/\n/g, " ").trim()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
