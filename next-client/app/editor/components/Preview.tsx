"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAtomValue } from "jotai";
import { HiOutlineInformationCircle, HiOutlineExclamation, HiOutlineExclamationCircle, HiOutlineLightBulb, HiOutlineCheckCircle } from "react-icons/hi";
import { atom_theme } from "@/app/atoms/ui-atoms";
import { FM_REGEX } from "@/app/utils/frontmatter-utils";

interface PreviewProps {
  content: string;
}

const CALLOUT_META: Record<string, { Icon: React.ComponentType<{ size?: number }>; className: string }> = {
  note: { Icon: HiOutlineInformationCircle, className: "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400" },
  tip: { Icon: HiOutlineLightBulb, className: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
  warning: { Icon: HiOutlineExclamation, className: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400" },
  danger: { Icon: HiOutlineExclamationCircle, className: "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400" },
  success: { Icon: HiOutlineCheckCircle, className: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
};

const REGEX_CALLOUT_TITLE = /^(>\s*)+\[!(\w+)\]([+-]?)\s*(.*)$/i;
const REGEX_QUOTE_DEPTH = /^(>\s*)+/;
const CALLOUT_MARKER_PREFIX = "__hermes_callout_";

// Obsidian callouts (`> [!note] Title`) are just blockquotes to a Markdown
// parser, and a soft line break inside a blockquote merges the title and
// body into one paragraph — there'd be no reliable place to cut "title"
// from "body" once react-markdown hands back parsed nodes. So this cuts the
// blocks out of the raw source first (same line-scan the editor's own
// codemirror/callout-fold.ts uses to find them) and re-emits each one as a
// fenced code block the `code` renderer below can recognize by its lang tag.
function preprocessCallouts(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(REGEX_CALLOUT_TITLE);
    if (!m) {
      out.push(line);
      i++;
      continue;
    }
    const type = m[2].toLowerCase();
    const title = m[4] || m[2];
    const bodyLines: string[] = [];
    i++;
    while (i < lines.length) {
      const bl = lines[i];
      if (!REGEX_QUOTE_DEPTH.test(bl) || bl.trim() === "") break;
      bodyLines.push(bl.replace(/^>\s?/, ""));
      i++;
    }
    out.push("```" + CALLOUT_MARKER_PREFIX + type);
    out.push(title);
    out.push(...bodyLines);
    out.push("```");
  }
  return out.join("\n");
}

// Mermaid ships a full parser/renderer — loaded once per module, not per
// diagram, and only client-side since it touches the DOM directly.
let mermaidPromise: Promise<typeof import("mermaid")["default"]> | null = null;
function loadMermaid() {
  if (!mermaidPromise) mermaidPromise = import("mermaid").then((m) => m.default);
  return mermaidPromise;
}

function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, "-");
  const theme = useAtomValue(atom_theme);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);
    loadMermaid()
      .then((mermaid) => {
        mermaid.initialize({ startOnLoad: false, theme: theme === "dark" ? "dark" : "default", securityLevel: "strict" });
        return mermaid.render(`mermaid-${id}`, code);
      })
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to render diagram");
      });
    return () => {
      cancelled = true;
    };
  }, [code, id, theme]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-ui-footnote text-red-600 dark:text-red-400 not-prose">
        <p className="font-medium mb-1">Mermaid diagram error</p>
        <p className="opacity-80">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="my-4 flex justify-center overflow-x-auto not-prose"
      // Mermaid's own output, not user HTML — securityLevel: "strict" above
      // has mermaid sanitize the SVG itself before it ever reaches here.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {!svg && <span className="text-ui-footnote opacity-40 py-6">Rendering diagram…</span>}
    </div>
  );
}

function Callout({ type, title, body }: { type: string; title: string; body: string }) {
  const meta = CALLOUT_META[type] ?? CALLOUT_META.note;
  return (
    <div className={`my-4 rounded-lg border px-4 py-3 not-prose ${meta.className}`}>
      <div className="flex items-center gap-2 font-semibold text-ui-body">
        <meta.Icon size={16} />
        {title}
      </div>
      {body && (
        <div className="mt-1.5 text-ink-light/80 dark:text-ink-dark/80 text-ui-footnote [&>:last-child]:mb-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function Preview({ content }: PreviewProps) {
  const body = preprocessCallouts(content.replace(FM_REGEX, ""));

  return (
    <div className="h-full overflow-y-auto px-6 py-8 md:px-12 md:py-12">
      <div className="prose dark:prose-invert prose-neutral max-w-3xl mx-auto prose-headings:font-bold prose-a:text-sage prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Mermaid/callout blocks render their own box, not a <pre>
            // (which would force monospace + pre-wrap onto them via
            // inherited styles) — unwrap just those, leave ordinary fenced
            // code blocks under their normal <pre> styling.
            pre({ children }) {
              const child = Array.isArray(children) ? children[0] : children;
              const childClassName = React.isValidElement(child)
                ? (child.props as { className?: string }).className
                : undefined;
              if (childClassName?.includes("language-mermaid") || childClassName?.includes(CALLOUT_MARKER_PREFIX)) {
                return <>{children}</>;
              }
              return <pre>{children}</pre>;
            },
            code({ className, children, node, ...props }) {
              const lang = /language-(\S+)/.exec(className || "")?.[1];
              const codeText = String(children).replace(/\n$/, "");

              if (lang === "mermaid") {
                return <MermaidDiagram code={codeText} />;
              }
              if (lang?.startsWith(CALLOUT_MARKER_PREFIX)) {
                const type = lang.slice(CALLOUT_MARKER_PREFIX.length);
                const [title, ...bodyLines] = codeText.split("\n");
                return <Callout type={type} title={title} body={bodyLines.join("\n")} />;
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {body}
        </ReactMarkdown>
      </div>
    </div>
  );
}
