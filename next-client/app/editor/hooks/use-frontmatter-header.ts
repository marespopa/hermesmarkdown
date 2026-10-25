"use client";

import { useCallback, useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { ISO_DATE_VALUE } from "../utils/frontmatter-header-chips";
import { bodyStart, frontmatterRangeOf } from "../codemirror/frontmatter-block";
import { FRONTMATTER_CHIP_EVENT, setFrontmatterValue, type FrontmatterChipRequest } from "../codemirror/frontmatter-header";

interface StatusMenuState {
  key: string;
  current: string;
  x: number;
  y: number;
}

interface DatePickerState {
  key: string;
  value: string;
  date: Date;
  /** The time of a datetime value (after the `T`), kept when a day is picked. */
  keptTime?: string;
}

interface UseFrontmatterHeaderOptions {
  viewRef: React.RefObject<EditorView | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

// After a menu or picker: focus goes back to the editor. A caret inside the
// block moves to the body start first, so the header stays in view with the
// new value instead of the raw YAML opening.
function returnToEditor(view: EditorView) {
  const range = frontmatterRangeOf(view.state.doc);
  const body = bodyStart(view.state.doc);
  if (range && body !== null && view.state.selection.ranges.some((r) => r.from <= range.closeTo)) {
    view.dispatch({ selection: { anchor: body } });
  }
  view.focus();
}

// Opens the status menu or the date picker when a header chip asks
// (FRONTMATTER_CHIP_EVENT) and writes the choice into the YAML value.
export function useFrontmatterHeader({ viewRef, containerRef }: UseFrontmatterHeaderOptions) {
  const [statusMenu, setStatusMenu] = useState<StatusMenuState | null>(null);
  const [datePicker, setDatePicker] = useState<DatePickerState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleRequest = (event: Event) => {
      const { kind, key, value, anchor } = (event as CustomEvent<FrontmatterChipRequest>).detail;
      if (kind === "status") {
        const at = anchor ?? viewRef.current?.coordsAtPos(0);
        const x = at?.left ?? 0;
        const y = (at && "bottom" in at ? at.bottom : 0) + 4;
        setStatusMenu({ key, current: value, x, y });
        return;
      }
      if (!ISO_DATE_VALUE.test(value)) return;
      const date = new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
      setDatePicker({ key, value, date, keptTime: value[10] === "T" ? value.slice(11) : undefined });
    };
    container.addEventListener(FRONTMATTER_CHIP_EVENT, handleRequest);
    return () => container.removeEventListener(FRONTMATTER_CHIP_EVENT, handleRequest);
  }, [containerRef, viewRef]);

  const close = useCallback(() => {
    setStatusMenu(null);
    setDatePicker(null);
    if (viewRef.current) returnToEditor(viewRef.current);
  }, [viewRef]);

  const selectStatus = useCallback((value: string) => {
    const view = viewRef.current;
    if (view && statusMenu) setFrontmatterValue(view, statusMenu.key, value);
    close();
  }, [close, statusMenu, viewRef]);

  const selectDate = useCallback((date: Date) => {
    const view = viewRef.current;
    if (view && datePicker) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const time = datePicker.keptTime ? `T${datePicker.keptTime}` : "";
      setFrontmatterValue(view, datePicker.key, `${y}-${m}-${d}${time}`);
    }
    close();
  }, [close, datePicker, viewRef]);

  return { statusMenu, datePicker, selectStatus, selectDate, close };
}
