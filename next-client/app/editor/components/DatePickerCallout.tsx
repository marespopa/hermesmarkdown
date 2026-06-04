"use client";

import React, { useState, useMemo, useEffect } from "react";
import { HiChevronLeft, HiChevronRight, HiX } from "react-icons/hi";

interface DatePickerCalloutProps {
  initialDate: Date;
  onSelectDate: (date: Date) => void;
  onClose?: () => void;
}

export default function DatePickerCallout({
  initialDate,
  onSelectDate,
  onClose,
}: DatePickerCalloutProps) {
  // Use current date as fallback if initialDate is invalid
  const validInitialDate = useMemo(() => isNaN(initialDate.getTime()) ? new Date() : initialDate, [initialDate]);
  
  const [viewDate, setViewDate] = useState(new Date(validInitialDate.getFullYear(), validInitialDate.getMonth(), 1));
  const [focusedDate, setFocusedDate] = useState<Date>(validInitialDate);

  // Sync focusedDate if validInitialDate changes
  useEffect(() => {
    setFocusedDate(validInitialDate);
  }, [validInitialDate]);

  // Keyboard navigation capturing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      
      const newDate = new Date(focusedDate);
      let handled = false;

      switch (e.key) {
        case 'ArrowRight':
          newDate.setDate(newDate.getDate() + 1);
          handled = true;
          break;
        case 'ArrowLeft':
          newDate.setDate(newDate.getDate() - 1);
          handled = true;
          break;
        case 'ArrowDown':
          newDate.setDate(newDate.getDate() + 7);
          handled = true;
          break;
        case 'ArrowUp':
          newDate.setDate(newDate.getDate() - 7);
          handled = true;
          break;
        case 'Enter':
          e.preventDefault();
          onSelectDate(focusedDate);
          return;
        case 'Escape':
          if (onClose) {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
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

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [focusedDate, viewDate, onSelectDate, onClose]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    
    const days = [];
    // Padding for previous month days
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= lastDay; i++) {
      days.push(i);
    }
    return days;
  }, [viewDate]);

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onSelectDate(selectedDate);
  };

  const handleQuickAction = (type: 'today' | 'tomorrow' | 'nextWeek' | 'nextMonth') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let targetDate = new Date(validInitialDate);
    targetDate.setHours(0, 0, 0, 0);

    switch (type) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'nextWeek':
        targetDate.setDate(targetDate.getDate() + 7);
        break;
      case 'nextMonth':
        targetDate.setMonth(targetDate.getMonth() + 1);
        break;
    }
    onSelectDate(targetDate);
  };

  // Prevent focus theft by using onMouseDown to prevent default
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div 
      className="relative z-[100] w-full sm:w-[320px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none"
      onMouseDown={preventFocusLoss}
    >
      {/* Main Calendar Section */}
      <div className="p-4 pt-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="font-bold text-ui-callout text-zinc-900 dark:text-zinc-100">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => changeMonth(-1)}
                className="p-1 h-8 w-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <HiChevronLeft className="w-5 h-5 text-blue-500" />
              </button>
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => changeMonth(1)}
                className="p-1 h-8 w-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <HiChevronRight className="w-5 h-5 text-blue-500" />
              </button>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                onMouseDown={preventFocusLoss}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-all"
                title="Close calendar"
              >
                <HiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
            <div key={idx} className="text-ui-caption font-medium text-zinc-400 uppercase h-6 flex items-center justify-center">
              {day}
            </div>
          ))}
          {daysInMonth.map((day, idx) => {
            const isFocused = day && day === focusedDate.getDate() && viewDate.getMonth() === focusedDate.getMonth() && viewDate.getFullYear() === focusedDate.getFullYear();
            const isInitial = day && day === validInitialDate.getDate() && viewDate.getMonth() === validInitialDate.getMonth() && viewDate.getFullYear() === validInitialDate.getFullYear();
            
            return (
              <div 
                key={idx}
                onMouseDown={preventFocusLoss}
                onClick={() => day && handleDateClick(day)}
                className={`
                  h-9 flex items-center justify-center text-ui-callout rounded-full transition-all
                  ${day ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}
                  ${isFocused && !isInitial ? "ring-2 ring-blue-500 ring-inset" : ""}
                  ${isInitial ? "bg-blue-500 text-white font-bold" : "text-zinc-700 dark:text-zinc-300"}
                `}
              >
                {day || ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shortcuts Footer */}
      <div className="bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800 p-3">
        <div className="flex flex-wrap gap-2 justify-center">
          <button 
            onMouseDown={preventFocusLoss}
            onClick={() => handleQuickAction('today')}
            className="text-ui-footnote py-1.5 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:text-blue-500 rounded-full transition-all font-medium text-zinc-600 dark:text-zinc-400"
          >
            Today
          </button>
          <button 
            onMouseDown={preventFocusLoss}
            onClick={() => handleQuickAction('tomorrow')}
            className="text-ui-footnote py-1.5 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:text-blue-500 rounded-full transition-all font-medium text-zinc-600 dark:text-zinc-400"
          >
            Tomorrow
          </button>
          <button 
            onMouseDown={preventFocusLoss}
            onClick={() => handleQuickAction('nextWeek')}
            className="text-ui-footnote py-1.5 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:text-blue-500 rounded-full transition-all font-medium text-zinc-600 dark:text-zinc-400"
          >
            +1 Week
          </button>
          <button 
            onMouseDown={preventFocusLoss}
            onClick={() => handleQuickAction('nextMonth')}
            className="text-ui-footnote py-1.5 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:text-blue-500 rounded-full transition-all font-medium text-zinc-600 dark:text-zinc-400"
          >
            +1 Month
          </button>
        </div>
      </div>
    </div>
  );
}
