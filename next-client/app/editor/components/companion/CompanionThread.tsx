"use client";

import React, { useEffect, useRef, useState } from "react";
import { MAX_TOOL_ROUNDS, stoppedAtCap, toolPartView, type CompanionMessage as Message } from "./companion-messages";
import CompanionMessage from "./CompanionMessage";
import { DelayedSpinner } from "./ToolActivityChip";
import { companionToolActivity } from "./tools/read-tools";
import TurnSummary from "./TurnSummary";
import ProposalReview from "./ProposalReview";

// What the call in flight is doing, from the newest reply; null when none is.
function runningToolLabel(messages: Message[], activities: Record<string, string>): string | null {
  const last = messages[messages.length - 1];
  if (last?.role !== "assistant") return null;
  for (const part of [...last.parts].reverse()) {
    const view = toolPartView(part);
    if (view?.state === "running") return activities[view.toolCallId] ?? companionToolActivity(view.toolName, view.input);
  }
  return null;
}

const STALL_HINT_SECONDS = 8;

// Seconds since the thread last changed, while busy (0 otherwise): a model
// that is thinking or a request that stalled shows no tokens, only this.
function useQuietSeconds(busy: boolean, messages: Message[]): number {
  const [quiet, setQuiet] = useState(0);
  useEffect(() => {
    setQuiet(0);
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(() => setQuiet(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy, messages]);
  return quiet;
}

interface CompanionThreadProps {
  messages: Message[];
  activities: Record<string, string>;
  status: "submitted" | "streaming" | "ready" | "error";
  compacting?: boolean;
  errorText: string | null;
  onUndoTurn: (turnId: string) => Promise<unknown>;
}

// The companion's conversation, scrolled to the newest turn: each message,
// a turn's summary (files changed, Undo) under its reply once it settled,
// one quiet working line (delayed spinner + what is running) for as long as a
// turn runs or a summary is being written (/compact), a note when a turn stopped at the tool-round cap, and
// the error that ended a turn.
export default function CompanionThread({ messages, activities, status, compacting = false, errorText, onUndoTurn }: CompanionThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // At most once per frame, however fast tokens arrive.
    const frame = requestAnimationFrame(() => bottomRef.current?.scrollIntoView?.({ block: "end" }));
    return () => cancelAnimationFrame(frame);
  }, [messages, status, compacting, errorText]);

  // Busy from send to finish, between tool rounds too: one line says so.
  const working = status === "submitted" || status === "streaming" || compacting;
  const quiet = useQuietSeconds(working, messages);
  const model = messages.findLast((message) => message.role === "user")?.metadata?.auto?.name;
  // Nothing has streamed for a while: say what is awaited and for how long.
  const waiting = quiet >= STALL_HINT_SECONDS ? `Waiting for ${model ?? "the model"}… ${quiet}s` : "Working…";
  const workingLabel = compacting ? "Summarizing the conversation…" : runningToolLabel(messages, activities) ?? waiting;
  const capped = status === "ready" && stoppedAtCap(messages);
  const lastReply = messages.findLastIndex((message) => message.role === "assistant");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-3" aria-live="polite">
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-ui-footnote text-fg-muted">Ask about your files.</p>
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
                <CompanionMessage message={message} activities={activities} latest={i === lastReply} working={working && i === lastReply} autoModel={message.role === "assistant" ? messages[i - 1]?.metadata?.auto?.name : undefined} />
                {turnId && settled && <TurnSummary turnId={turnId} onUndo={onUndoTurn} />}
              </React.Fragment>
            );
          })}
          {working && (
            <p className="flex items-center gap-1.5 py-1 text-ui-caption text-fg-muted" role="status">
              <DelayedSpinner />
              <span className="min-w-0 truncate">{workingLabel}</span>
            </p>
          )}
          {capped && (
            <p className="text-ui-caption text-fg-muted">
              Stopped after {MAX_TOOL_ROUNDS} rounds of tool calls. Say "continue" to pick up where it left off.
            </p>
          )}
          {errorText && (
            <p role="alert" className="text-ui-caption text-danger whitespace-pre-wrap">{errorText}</p>
          )}
          <ProposalReview />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
