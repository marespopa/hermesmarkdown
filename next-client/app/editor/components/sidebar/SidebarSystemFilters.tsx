"use client";

import React from "react";
import { HiOutlineArchive, HiOutlineCheckCircle, HiOutlineClock, HiOutlineCollection, HiOutlineTag } from "react-icons/hi";
import Button from "@/app/components/Button";
import CountBadge from "@/app/components/CountBadge";
import { NOTE_FILTER_LABELS, NOTE_FILTERS, type NoteFilter } from "../../tags/tag-index";
import { useTagIndex } from "../../tags/use-tag-index";
import SidebarSection from "./SidebarSection";
import { SIDEBAR_ICON_CLASS, sidebarItemClass } from "./sidebar-classes";
import { useTagNavigation } from "./use-tag-navigation";

const GLYPHS: Record<NoteFilter, React.ReactNode> = {
  all: <HiOutlineCollection size={15} />,
  untagged: <HiOutlineTag size={15} />,
  todo: <HiOutlineCheckCircle size={15} />,
  today: <HiOutlineClock size={15} />,
  archive: <HiOutlineArchive size={15} />,
};

// The smart filters (All Notes, Untagged, Todo, Today, Archive), each with
// how many notes it holds. A click lists them on the Tags page; the one
// showing is highlighted. Shown above Files and Tags alike. Reads the URL,
// so it needs a Suspense boundary above it.
export default function SidebarSystemFilters() {
  const { filterCounts } = useTagIndex();
  const { filter, openFilter } = useTagNavigation();
  return (
    <SidebarSection title="Filters">
      {NOTE_FILTERS.map((id) => (
        <Button
          key={id}
          variant="unstyled"
          onClick={() => openFilter(id)}
          aria-current={filter === id ? "page" : undefined}
          className={`${sidebarItemClass(filter === id)} w-full`}
        >
          <span aria-hidden="true" className={SIDEBAR_ICON_CLASS}>{GLYPHS[id]}</span>
          <span className="min-w-0 flex-1 truncate">{NOTE_FILTER_LABELS[id]}</span>
          <CountBadge count={filterCounts[id]} />
        </Button>
      ))}
    </SidebarSection>
  );
}
