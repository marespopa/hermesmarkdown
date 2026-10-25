"use client";

import React from "react";
import type { EditorView } from "@codemirror/view";
import { useFrontmatterHeader } from "../../hooks/use-frontmatter-header";
import DatePickerCallout from "../DatePickerCallout";
import FrontmatterStatusMenu from "../FrontmatterStatusMenu";

interface FrontmatterHeaderMenusProps {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// The status menu and date picker of the frontmatter header's chips.
export default function FrontmatterHeaderMenus({ viewRef, containerRef }: FrontmatterHeaderMenusProps) {
  const { statusMenu, datePicker, selectStatus, selectDate, close } = useFrontmatterHeader({ viewRef, containerRef });
  return (
    <>
      {statusMenu && (
        <FrontmatterStatusMenu x={statusMenu.x} y={statusMenu.y} current={statusMenu.current} onSelect={selectStatus} onClose={close} />
      )}
      {datePicker && (
        <DatePickerCallout isOpen initialDate={datePicker.date} keptTime={datePicker.keptTime} onSelectDate={selectDate} onClose={close} />
      )}
    </>
  );
}
