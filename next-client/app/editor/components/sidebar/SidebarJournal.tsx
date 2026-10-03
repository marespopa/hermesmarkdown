"use client";

import React, { useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { HiOutlineCalendar } from "react-icons/hi";
import { atom_homeFeedOpen, atom_journalEntryRequest } from "@/app/atoms/ui-atoms";
import Button from "@/app/components/Button";
import { isoDate, journalDateOfPath } from "@/app/utils/journal";
import { formatShortcut } from "@/app/utils/platform";
import { useJournalEntries } from "../../hooks/use-journal-entries";
import JournalCalendar from "../JournalCalendar";
import { SIDEBAR_ITEM_CLASS, SIDEBAR_ITEM_CURRENT_CLASS, SIDEBAR_ITEM_IDLE_CLASS } from "./SidebarNoteList";

interface SidebarJournalProps {
  /** The note on screen, to mark Today while today's entry is open. */
  currentPath: string | null;
  /** Hide the month grid (e.g. on narrow sheets). */
  showCalendar?: boolean;
  /** Called after a day was requested (e.g. to close a sheet). */
  onNavigate?: () => void;
}

// Today (Ctrl/Cmd+Shift+D) and the journal month calendar. Both ask the
// editor page to open — or create — a day's entry via atom_journalEntryRequest.
export default function SidebarJournal({ currentPath, showCalendar = true, onNavigate }: SidebarJournalProps) {
  const setRequest = useSetAtom(atom_journalEntryRequest);
  const requestEntry = (request: { date: string }) => {
    setRequest(request);
    onNavigate?.();
  };
  const homeFeedOpen = useAtomValue(atom_homeFeedOpen);
  const { entries, titles } = useJournalEntries();
  const today = useMemo(() => new Date(), [entries]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayIso = isoDate(today);
  const openDay = !homeFeedOpen && currentPath ? journalDateOfPath(currentPath) : null;
  const currentDay = openDay && entries.get(openDay) === currentPath ? openDay : null;
  const isTodayOpen = currentDay === todayIso;

  return (
    <div className="flex flex-col gap-2 pb-3">
      <Button
        variant="unstyled"
        onClick={() => requestEntry({ date: todayIso })}
        aria-current={isTodayOpen ? "page" : undefined}
        title={`Open today's note (${formatShortcut("D", { shift: true })})`}
        className={`${SIDEBAR_ITEM_CLASS} ${isTodayOpen ? SIDEBAR_ITEM_CURRENT_CLASS : SIDEBAR_ITEM_IDLE_CLASS}`}
      >
        <HiOutlineCalendar size={15} aria-hidden="true" className="shrink-0 opacity-70" />
        <span className="flex-1 min-w-0 truncate">Today</span>
        <span className="shrink-0 text-ui-micro text-fg-faint">{formatShortcut("D", { shift: true })}</span>
      </Button>
      {showCalendar && (
        <JournalCalendar entries={entries} titles={titles} today={today} currentDay={currentDay} onOpenDate={(date) => requestEntry({ date })} className="px-1" />
      )}
    </div>
  );
}
