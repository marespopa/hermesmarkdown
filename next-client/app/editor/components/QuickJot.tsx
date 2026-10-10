"use client";

import React, { useCallback, useRef, useState } from "react";
import { useAtom } from "jotai";
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";
import Button from "@/app/components/Button";
import { BareInput } from "@/app/components/Input";
import { showActionToast, showErrorToast } from "@/app/components/Toastr";
import { atom_quickJot } from "@/app/atoms/ui-atoms";
import useIsMobileChrome from "@/app/hooks/use-mobile-chrome";
import { todayNoteName } from "@/app/utils/today-note";
import { useQuickJot } from "../hooks/use-quick-jot";
import { useQuickJotEntry } from "../hooks/use-quick-jot-entry";

interface QuickJotProps {
  /** Disables the command and the shortcut (no vault, vault loading). */
  disabledReason?: string;
  /** Opens today's sheet: the success toast's "Open". */
  onOpenSheet: () => void;
}

// One-line input over the current view that appends to today's sheet.
// Enter adds and closes; Escape closes and clears; a click outside closes
// but keeps the text for next time. The input closes before writing, so
// the folder and template prompts never fight it for focus, and reopens
// with the text when the write is cancelled or fails.
export default function QuickJot({ disabledReason, onOpenSheet }: QuickJotProps) {
  const [state, setState] = useAtom(atom_quickJot);
  const { addJot } = useQuickJot();
  const isMobileChrome = useIsMobileChrome();
  const inputRef = useRef<HTMLInputElement>(null);

  // The date in the caption is the one when the input opened.
  const [wasOpen, setWasOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState("");
  if (state.open !== wasOpen) {
    setWasOpen(state.open);
    if (state.open) setOpenedOn(todayNoteName(new Date()));
  }

  useQuickJotEntry({ disabledReason, onRefocus: () => inputRef.current?.focus() });

  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [setState]);
  const cancel = useCallback(() => setState({ open: false, text: "" }), [setState]);

  const submit = useCallback(async () => {
    const text = state.text;
    setState({ open: false, text: "" });
    if (!text.trim()) return;
    const outcome = await addJot(text);
    if (outcome.result === "added") {
      showActionToast(`Added to ${outcome.sheetName}`, "Open", onOpenSheet);
      return;
    }
    if (outcome.result === "failed") showErrorToast("Couldn't add to today's sheet");
    // Already in the open tab's buffer: the next autosave writes it, and
    // offering it again would add it twice.
    if (outcome.result === "failed" && outcome.keptInBuffer) return;
    setState((s) => ({ open: true, text: s.text || text }));
  }, [state.text, setState, addJot, onOpenSheet]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  };

  // A single-line input drops pasted newlines (gluing the lines together);
  // they become single spaces instead.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!/[\r\n]/.test(pasted)) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const flat = pasted.replace(/\s*\r?\n\s*/g, " ");
    const text = el.value.slice(0, start) + flat + el.value.slice(end);
    setState((s) => ({ ...s, text }));
    requestAnimationFrame(() => el.setSelectionRange(start + flat.length, start + flat.length));
  };

  return (
    <OverlayPanel
      isOpen={state.open}
      onClose={close}
      variant="modal"
      backdrop="transparent"
      dismissOn={["click-outside"]}
      lockScroll={false}
      containerClassName={`items-start justify-center px-3 ${isMobileChrome ? "pt-3" : "pt-[12vh]"}`}
      panelClassName="w-[560px] max-w-[calc(100vw-1.5rem)] bg-overlay border border-edge rounded-xl shadow-lg"
    >
      <div className="flex flex-col gap-1 px-4 py-3" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2">
          <BareInput
            ref={inputRef}
            autoFocus
            enterKeyHint="done"
            aria-label="Quick jot"
            value={state.text}
            placeholder="Add to today's sheet…"
            onChange={(e) => setState((s) => ({ ...s, text: e.target.value }))}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              void submit();
            }}
            className="min-w-0 flex-1 bg-transparent text-ui-callout text-fg outline-none caret-accent placeholder:text-fg-faint"
          />
          <Button variant="tertiary" className="!h-8 shrink-0" onClick={() => void submit()}>
            Add
          </Button>
        </div>
        <p className="text-ui-caption text-fg-faint">Enter adds to {openedOn} · Esc cancels</p>
      </div>
    </OverlayPanel>
  );
}
