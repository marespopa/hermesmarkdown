import React from "react";
import { useTimer } from "@/app/services/useTimer";
import { TIMER_CONFIG } from "@/app/constants/timer";

export const StatusBarTimer: React.FC = () => {
  const { timeLeft, formatTime, isActive, toggle, reset } = useTimer(
    TIMER_CONFIG.default,
  );

  let timerColor = "text-neutral-500";
  let timerAnimation = "";
  if (isActive) {
    timerColor = "text-amber-500";
    timerAnimation = "animate-pulse";
  } else if (timeLeft === 0) {
    timerColor = "text-red-500";
  }

  return (
    <div
      className={`flex items-center gap-2 font-jetbrains-mono text-sm cursor-pointer select-none ${timerColor} ${timerAnimation}`}
      title="Click to start/pause, Double-click to reset"
      onClick={toggle}
      onDoubleClick={reset}
    >
      <span>
        {isActive ? (
          <svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : timeLeft === 0 ? (
          <svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
        ) : (
          <svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        )}
      </span>
      <span>{formatTime()}</span>
      <span className="ml-1" onClick={reset} title="Reset">
        <svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2v2a8 8 0 1 1-8 8H2" />
        </svg>
      </span>
    </div>
  );
};
