"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { HiOutlineCheck, HiOutlineDocumentDuplicate } from "react-icons/hi";
import Button from "@/app/components/Button";
import TextLink from "@/app/components/TextLink";
import { replyItems, typedText, type CompanionMessage as Message } from "./companion-messages";
import ToolActivityChip from "./ToolActivityChip";
import TrashConfirmCard from "./TrashConfirmCard";
import { atom_trashRequests } from "./trash-confirm";
import { replyToHtml } from "./reply-html";

// One turn of the companion thread (adapted from ai-chat/ChatMessageItem).
// A user turn shows what they typed and the labels of the context it carried;
// the summary a compacted thread starts with (/compact) shows as a quiet
// card.
// An assistant turn shows its parts in order: text rendered as Markdown
// (reply-html.ts; web links open in a new tab)
// and a trash call waiting for the user's answer as its TrashConfirmCard.
// Finished and failed tool calls are debugging detail, left behind a quiet
// "Show N steps"; a running call is left to the thread's working line while
// `working`,
// then the pages a web search drew on as links. Its Markdown can be copied: the latest reply always shows Copy,
// earlier ones on hover or keyboard focus.
function CompanionMessage({ message, activities, latest = false, working = false, autoModel }: { message: Message; activities: Record<string, string>; latest?: boolean; working?: boolean; autoModel?: string }) {
  const [copied, setCopied] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const trashRequests = useAtomValue(atom_trashRequests);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  if (message.metadata?.summary) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-edge-subtle px-3 py-2">
        <p className="text-ui-caption text-fg-faint">Earlier conversation, summarized</p>
        <ReplyText markdown={typedText(message)} />
      </div>
    );
  }

  if (message.role === "user") {
    const context = message.metadata?.context ?? [];
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[88%] rounded-xl bg-fill px-3 py-2 text-ui-footnote text-fg whitespace-pre-wrap leading-relaxed">
          {typedText(message)}
        </div>
        {context.length > 0 && (
          <p className="max-w-[88%] truncate text-ui-caption text-fg-faint" title={context.join(", ")}>
            With {context.join(", ")}
          </p>
        )}
      </div>
    );
  }

  // Pages a web search drew on, once each, for the links under the reply.
  const sources = message.parts
    .filter((part): part is Extract<typeof part, { type: "source-url" }> => part.type === "source-url")
    .filter((part, i, all) => all.findIndex((other) => other.url === part.url) === i)
    .filter((part) => /^https?:\/\//i.test(part.url));

  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n\n")
    .trim();

  const { items, hidden } = replyItems(message.parts);

  return (
    <div className="group flex flex-col gap-1.5">
      {items.map((item) => {
        if ("tool" in item) {
          const view = item.tool;
          if (trashRequests[view.toolCallId]) return <TrashConfirmCard key={view.toolCallId} toolCallId={view.toolCallId} />;
          // The thread's working line already names the call in flight.
          return working ? null : <ToolActivityChip key={view.toolCallId} view={view} activity={activities[view.toolCallId]} />;
        }
        const { part, index } = item;
        return part.type === "text" && part.text.trim() ? <ReplyText key={index} markdown={part.text} /> : null;
      })}
      {hidden.length > 0 && (
        <div className="flex flex-col gap-1">
          <Button variant="unstyled" className="self-start text-ui-caption text-fg-faint hover:text-fg-muted" aria-expanded={showSteps} onClick={() => setShowSteps((open) => !open)}>
            {showSteps ? "Hide" : "Show"} {hidden.length} step{hidden.length === 1 ? "" : "s"}
          </Button>
          {showSteps && hidden.map((view) => <ToolActivityChip key={view.toolCallId} view={view} activity={activities[view.toolCallId]} />)}
        </div>
      )}
      {sources.length > 0 && (
        <div className="flex flex-col gap-0.5 pt-0.5">
          <p className="text-ui-caption text-fg-faint">Sources</p>
          {sources.map((source) => (
            <TextLink key={source.url} href={source.url} variant="quiet" className="truncate text-ui-caption text-fg-muted" title={source.url}>
              {source.title || new URL(source.url).hostname}
            </TextLink>
          ))}
        </div>
      )}
      {text && (
        <div className={`flex items-center gap-2 ${latest ? "" : "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"}`}>
          <Button
            variant="small"
            className="!h-7 bg-fill hover:bg-fill-hover"
            onClick={() => {
              navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {});
            }}
            title="Copy reply as Markdown"
          >
            {copied ? <HiOutlineCheck size={13} /> : <HiOutlineDocumentDuplicate size={13} />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {autoModel && <span className="truncate text-ui-caption text-fg-faint">Auto → {autoModel}</span>}
        </div>
      )}
    </div>
  );
}

// One text part of a reply. The renderer escapes everything; the only markup
// is its own.
function ReplyText({ markdown }: { markdown: string }) {
  const html = useMemo(() => replyToHtml(markdown), [markdown]);
  return (
    <div
      className="companion-reply text-ui-footnote leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(event) => {
        const link = (event.target as HTMLElement).closest("a");
        if (!link) return;
        event.preventDefault();
        window.open(link.href, "_blank", "noopener,noreferrer");
      }}
    />
  );
}

// Earlier messages don't change while a reply streams: skip their re-render per token.
export default memo(CompanionMessage);
