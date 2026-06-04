"use client";

import React, { useState, useMemo, useEffect } from "react";
import { HiChevronLeft, HiChevronRight, HiDotsHorizontal, HiX } from "react-icons/hi";

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
  const [showMobileMore, setShowMobileMore] = useState(false);

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
  }, [focusedDate, viewDate, onSelectDate]);

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
      className="relative z-[100] w-full sm:w-[400px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col sm:flex-row overflow-hidden select-none"
      onMouseDown={preventFocusLoss}
    >
      {onClose && (
        <button
          onClick={onClose}
          onMouseDown={preventFocusLoss}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full shadow-md transition-all z-20"
          title="Close calendar"
        >
          <HiX className="w-4 h-4" />
        </button>
      )}

      {/* Main Calendar Section */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <button 
            onMouseDown={preventFocusLoss}
            onClick={() => changeMonth(-1)}
            className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <HiChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button 
            onMouseDown={preventFocusLoss}
            onClick={() => changeMonth(1)}
            className="p-1 min-h-[32px] min-w-[32px] flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <HiChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
            <div key={day} className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
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
                  h-8 md:h-9 flex items-center justify-center text-sm rounded-lg transition-all
                  ${day ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400" : ""}
                  ${isFocused && !isInitial ? "ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/30" : ""}
                  ${isInitial ? "bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20" : "text-zinc-600 dark:text-zinc-400"}
                `}
              >
                {day || ""}
              </div>
            );
          })}
        </div>

        {/* Mobile-only toggle */}
        <button
          onClick={() => setShowMobileMore(!showMobileMore)}
          className="sm:hidden w-full mt-2 py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-blue-500 transition-colors border-t border-zinc-100 dark:border-zinc-800"
        >
          <HiDotsHorizontal className="w-4 h-4" />
          {showMobileMore ? "Less" : "More Shortcuts"}
        </button>
      </div>

      {/* Sidebar Section (Desktop always visible, Mobile toggleable) */}
      <div className={`
        ${showMobileMore ? "flex" : "hidden"} sm:flex
        flex-col w-full sm:w-[130px] 
        bg-zinc-50/50 dark:bg-zinc-800/20 
        border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-800 
        p-3 gap-2
      `}>
        <span className="hidden sm:block text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1 px-1">Shortcuts</span>
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => handleQuickAction('today')}
          className="text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-500 rounded-lg transition-all font-semibold text-zinc-700 dark:text-zinc-300 text-left"
        >
          Today
        </button>
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => handleQuickAction('tomorrow')}
          className="text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-500 rounded-lg transition-all font-semibold text-zinc-700 dark:text-zinc-300 text-left"
        >
          Tomorrow
        </button>
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => handleQuickAction('nextWeek')}
          className="text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-500 rounded-lg transition-all font-semibold text-zinc-700 dark:text-zinc-300 text-left"
        >
          Next Week
        </button>
        <button 
          onMouseDown={preventFocusLoss}
          onClick={() => handleQuickAction('nextMonth')}
          className="text-xs py-2 px-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-500 rounded-lg transition-all font-semibold text-zinc-700 dark:text-zinc-300 text-left"
        >
          Next Month
        </button>
      </div>
    </div>
  );
}
