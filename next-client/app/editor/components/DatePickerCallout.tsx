"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { HiChevronLeft, HiChevronRight, HiX } from "react-icons/hi";
import DialogModal from "../../components/DialogModal/DialogModal";
import Button from "../../components/Button";

interface DatePickerCalloutProps {
  isOpen: boolean;
  initialDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

export default function DatePickerCallout({
  isOpen,
  initialDate,
  onSelectDate,
  onClose,
}: DatePickerCalloutProps) {
  const validInitialDate = useMemo(
    () => (isNaN(initialDate.getTime()) ? new Date() : initialDate),
    [initialDate],
  );

  const [viewDate, setViewDate] = useState(
    () => new Date(validInitialDate.getFullYear(), validInitialDate.getMonth(), 1),
  );
  const [focusedDate, setFocusedDate] = useState<Date>(validInitialDate);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFocusedDate(validInitialDate);
    setViewDate(new Date(validInitialDate.getFullYear(), validInitialDate.getMonth(), 1));
  }, [validInitialDate]);

  useEffect(() => {
    if (isOpen) {
      // Let the dialog render first, then focus the calendar grid for arrow-key nav
      const id = setTimeout(() => containerRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const newDate = new Date(focusedDate);
    let handled = false;
    switch (e.key) {
      case "ArrowRight": newDate.setDate(newDate.getDate() + 1); handled = true; break;
      case "ArrowLeft":  newDate.setDate(newDate.getDate() - 1); handled = true; break;
      case "ArrowDown":  newDate.setDate(newDate.getDate() + 7); handled = true; break;
      case "ArrowUp":    newDate.setDate(newDate.getDate() - 7); handled = true; break;
      case "Enter":
        e.preventDefault();
        onSelectDate(focusedDate);
        return;
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      setFocusedDate(newDate);
      if (newDate.getMonth() !== viewDate.getMonth() || newDate.getFullYear() !== viewDate.getFullYear()) {
        setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
      }
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay; i++) days.push(i);
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleQuickAction = (type: "today" | "tomorrow" | "nextWeek" | "nextMonth") => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (type === "today") {
      onSelectDate(today);
      return;
    }
    if (type === "tomorrow") {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      onSelectDate(tomorrow);
      return;
    }

    const target = new Date(focusedDate);
    target.setHours(0, 0, 0, 0);
    if (type === "nextWeek") target.setDate(target.getDate() + 7);
    if (type === "nextMonth") target.setMonth(target.getMonth() + 1);

    setFocusedDate(target);
    // Ensure the calendar view follows the new focused date
    if (
      target.getMonth() !== viewDate.getMonth() ||
      target.getFullYear() !== viewDate.getFullYear()
    ) {
      setViewDate(new Date(target.getFullYear(), target.getMonth(), 1));
    }
  };

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} hideCloseButton>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="font-bold text-ui-callout text-ink-light dark:text-ink-dark">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="p-1 h-8 w-8 flex items-center justify-center hover:bg-paper-softgray dark:hover:bg-paper-dark-surface rounded-full transition-colors"
            >
              <HiChevronLeft className="w-5 h-5 text-sage" />
            </Button>
            <Button
              variant="icon"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="p-1 h-8 w-8 flex items-center justify-center hover:bg-paper-softgray dark:hover:bg-paper-dark-surface rounded-full transition-colors"
            >
              <HiChevronRight className="w-5 h-5 text-sage" />
            </Button>
            <Button
              variant="icon"
              onClick={onClose}
              aria-label="Close calendar"
              className="p-1 h-8 w-8 flex items-center justify-center hover:bg-paper-softgray dark:hover:bg-paper-dark-surface rounded-full transition-colors ml-1"
            >
              <HiX className="w-4 h-4 text-stone" />
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
            <div key={idx} className="text-ui-caption font-medium text-stone uppercase h-6 flex items-center justify-center">
              {d}
            </div>
          ))}
          {daysInMonth.map((day, idx) => {
            const isFocused = day !== null &&
              day === focusedDate.getDate() &&
              viewDate.getMonth() === focusedDate.getMonth() &&
              viewDate.getFullYear() === focusedDate.getFullYear();
            const isSelected = day !== null &&
              day === validInitialDate.getDate() &&
              viewDate.getMonth() === validInitialDate.getMonth() &&
              viewDate.getFullYear() === validInitialDate.getFullYear();

            return (
              <div
                key={idx}
                onClick={() => day !== null && onSelectDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                className={`
                  h-9 flex items-center justify-center text-ui-callout rounded-full transition-all
                  ${day !== null ? "cursor-pointer hover:bg-paper-softgray dark:hover:bg-paper-dark-surface" : ""}
                  ${isFocused && !isSelected ? "ring-2 ring-sage ring-inset" : ""}
                  ${isSelected ? "bg-sage text-white font-bold" : "text-ink-light dark:text-ink-dark"}
                `}
              >
                {day ?? ""}
              </div>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="border-t border-beige-light dark:border-clay pt-3 mt-1">
          <div className="flex flex-wrap gap-2 justify-center">
            {(["today", "tomorrow", "nextWeek", "nextMonth"] as const).map((action) => (
              <Button
                key={action}
                variant="bare"
                onClick={() => handleQuickAction(action)}
                className="text-ui-footnote py-1.5 px-3 bg-paper-softgray dark:bg-paper-dark-surface border border-edge hover:border-sage hover:text-sage rounded-full transition-all font-medium text-ink-muted dark:text-stone"
              >
                {{ today: "Today", tomorrow: "Tomorrow", nextWeek: "+1 Week", nextMonth: "+1 Month" }[action]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </DialogModal>
  );
}
