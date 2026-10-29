"use client";

import React, { useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  COMPANION_DEFAULT_WIDTH,
  COMPANION_MAX_WIDTH,
  COMPANION_MIN_WIDTH,
  atom_companionOpen,
  atom_companionRequest,
  atom_companionWidth,
} from "@/app/atoms/companion-atoms";
import CompanionComposer from "./CompanionComposer";
import CompanionHeader from "./CompanionHeader";
import CompanionThread from "./CompanionThread";
import { useCompanionChat } from "./use-companion-chat";

// The AI companion: a panel on the window's trailing edge, mirroring the
// sidebar on the leading one (WorkspaceSidebar). EditorShell mounts it in a
// zero-width wrapper and gives its width to `--content-right`, so the page
// moves over instead of being covered; hidden, it slides out by its own
// width and takes no input (inert). Resized by dragging its leading edge or
// with the arrow keys there (double-click resets); Escape that nothing inside
// handled closes it. On mobile (`sheet`) it is a full-height sheet over the
// page. The conversation lives here, so closing and reopening keeps it.
export default function CompanionPanel({ sheet = false }: { sheet?: boolean }) {
  const [open, setOpen] = useAtom(atom_companionOpen);
  const [width, setWidth] = useAtom(atom_companionWidth);
  const request = useAtomValue(atom_companionRequest);
  const chat = useCompanionChat();

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const placement = sheet
    ? { className: "fixed inset-0 z-50 transition-transform", style: { transform: open ? "none" : "translateY(100%)" } }
    : { className: "absolute inset-y-0 border-l border-edge-subtle transition-[right]", style: { width, right: open ? 0 : -width } };

  return (
    <aside
      aria-labelledby="companion-title"
      inert={!open}
      onKeyDown={(event) => {
        // A pop-up menu (the model picker) is portalled out of the panel; its
        // Escape closes only the menu.
        if (event.key !== "Escape" || event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
        event.preventDefault();
        setOpen(false);
      }}
      style={placement.style}
      className={`${placement.className} flex flex-col bg-surface paper-grain font-sans text-fg duration-layout ease-layout motion-reduce:transition-none`}
    >
      <CompanionHeader
        open={open}
        onClose={() => setOpen(false)}
      />
      <CompanionThread
        messages={chat.messages}
        activities={chat.activities}
        status={chat.status}
        compacting={chat.compacting}
        errorText={chat.errorText}
        onUndoTurn={chat.undoTurn}
      />
      <CompanionComposer
        request={request}
        isBusy={chat.isBusy}
        onSend={(text, context) => void chat.send(text, context)}
        onStop={() => void chat.stop()}
      />

      {!sheet && (
        // Resize handle on the leading edge, as the sidebar's trailing one.
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label="Resize AI panel"
          aria-valuemin={COMPANION_MIN_WIDTH}
          aria-valuemax={COMPANION_MAX_WIDTH}
          aria-valuenow={width}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 32 : 8;
            const delta = event.key === "ArrowLeft" ? step : event.key === "ArrowRight" ? -step : 0;
            if (!delta) return;
            event.preventDefault();
            setWidth(width + delta);
          }}
          onPointerDown={(event) => {
            dragRef.current = { startX: event.clientX, startWidth: width };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            setWidth(dragRef.current.startWidth - (event.clientX - dragRef.current.startX));
          }}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onDoubleClick={() => setWidth(COMPANION_DEFAULT_WIDTH)}
          className="group absolute top-0 -left-1 bottom-0 w-2 cursor-col-resize z-10 outline-none"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fg-faint opacity-0 transition-opacity duration-150 delay-100 group-hover:opacity-60 group-active:opacity-100 group-focus-visible:opacity-100"
          />
        </div>
      )}
    </aside>
  );
}
