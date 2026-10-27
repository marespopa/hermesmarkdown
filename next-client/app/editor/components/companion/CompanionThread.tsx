"use client";

import React, { useEffect, useRef } from "react";
import { MAX_TOOL_ROUNDS, stoppedAtCap, type CompanionMessage as Message } from "./companion-messages";
import CompanionMessage from "./CompanionMessage";
import TurnSummary from "./TurnSummary";

interface CompanionThreadProps {
  messages: Message[];
  activities: Record<string, string>;
  status: "submitted" | "streaming" | "ready" | "error";
  errorText: string | null;
  onUndoTurn: (turnId: string) => Promise<unknown>;
}

// The companion's conversation, scrolled to the newest turn: each message,
// a turn's summary (files changed, Undo) under its reply once it settled,
// three dots while the model hasn't started its reply, a note when a turn
// stopped at the tool-round cap, and the error that ended a turn.
export default function CompanionThread({ messages, activities, status, errorText, onUndoTurn }: CompanionThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, status, errorText]);

  const waiting = status === "submitted";
  const capped = status === "ready" && stoppedAtCap(messages);
  const lastReply = messages.findLastIndex((message) => message.role === "assistant");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-3" aria-live="polite">
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-ui-footnote text-fg-muted">Ask about your notes and files.</p>
          <p className="text-ui-caption text-fg-faint">Type @ to add a file, a folder or the whole vault.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((message, i) => {
            // A turn is a user message and the reply after it; its summary
            // follows the reply once nothing is running.
            const turnId = message.role === "assistant" && messages[i - 1]?.role === "user" ? messages[i - 1].id : null;
            const settled = i < messages.length - 1 || (status !== "submitted" && status !== "streaming");
            return (
              <React.Fragment key={message.id}>
                <CompanionMessage message={message} activities={activities} latest={i === lastReply} />
                {turnId && settled && <TurnSummary turnId={turnId} onUndo={onUndoTurn} />}
              </React.Fragment>
            );
          })}
          {waiting && (
            <div className="flex items-center gap-1 py-1" aria-label="Thinking">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-faint [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-faint [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-faint [animation-delay:300ms]" />
            </div>
          )}
          {capped && (
            <p className="text-ui-caption text-fg-muted">
              Stopped after {MAX_TOOL_ROUNDS} rounds of lookups without an answer. Try asking more specifically.
            </p>
          )}
          {errorText && (
            <p role="alert" className="text-ui-caption text-danger whitespace-pre-wrap">{errorText}</p>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
