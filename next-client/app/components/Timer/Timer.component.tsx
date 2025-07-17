import { FaPause, FaPlay, FaStop, FaTimes } from "react-icons/fa";
import Button from "../Button";
import { useEffect, useState } from "react";
import { useDocumentTitle } from "@/app/hooks/use-document-title";
import IconButton from "../Button";

type Props = {
  isTimerCounting: boolean;
  mainTime: number;
  startTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
  setDuration: (minutes: number) => void;
  duration: number;
  onClose?: () => void;
  fileName?: string;
};

function formatTime(time: number) {
  if (typeof time !== "number" || isNaN(time) || time < 0) return "00:00";
  const minutes = Math.floor(time / 60).toString().padStart(2, "0");
  const seconds = (time % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const TimerComponent = ({
  isTimerCounting,
  mainTime,
  startTimer,
  pauseTimer,
  stopTimer,
  setDuration,
  duration,
  onClose,
  fileName,
}: Props) => {
  const [, setDocumentTitle] = useDocumentTitle("Hermes Markdown");
  const [inputValue, setInputValue] = useState(String(Math.floor(duration / 60)));
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (isTimerCounting) {
      // Update document title with timer and file name
      const minutes = Math.floor(mainTime / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (mainTime % 60).toString().padStart(2, "0");
      setDocumentTitle(`${minutes}:${seconds} - ${fileName || "File"}`);
    } else {
      setDocumentTitle(fileName || "File");
    }
  }, [mainTime, setDocumentTitle, isTimerCounting, fileName]);

  useEffect(() => {
    setInputValue(String(Math.floor(duration / 60)));
  }, [duration]);

  function handleInputBlur() {
    setEditMode(false);
    let min = Number(inputValue) || 1;
    min = Math.max(1, Math.min(120, min));
    setInputValue(String(min));
    setDuration(min);
  }
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-lg border px-4 py-2 flex flex-col items-center shadow-sm bg-neutral-800 border-neutral-700 text-white dark:bg-neutral-700 dark:text-white relative">
        {onClose && (
          <IconButton
            variant="icon"
            aria-label="Close timer"
            onClick={onClose}
            className="absolute top-2 right-2"
          >
            <FaTimes className="w-4 h-4 text-white" />
          </IconButton>
        )}
        {!isTimerCounting && editMode ? (
          <input
            id="timer-minutes"
            type="text"
            pattern="^\\d{1,3}$"
            inputMode="numeric"
            minLength={1}
            maxLength={3}
            value={inputValue}
            autoFocus
            onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setInputValue(val);
            }}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-12 text-center text-xl font-mono rounded bg-neutral-800 border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            aria-label="Set timer duration (minutes)"
            placeholder="min"
          />
        ) : (
          <div
            className="text-xl font-mono cursor-pointer select-none"
            onClick={() => {
              if (!isTimerCounting) setEditMode(true);
            }}
            title={"Click to set minutes"}
          >
            {formatTime(mainTime)}
          </div>
        )}
        <div className="flex gap-1 mt-1">
          {!isTimerCounting && (
            <Button variant="icon" aria-label="Start" onClick={startTimer}
              styles="hover:bg-neutral-700 focus:bg-neutral-700 active:bg-neutral-700">
              <FaPlay className="w-4 h-4 text-white" />
            </Button>
          )}
          {isTimerCounting && (
            <Button variant="icon" aria-label="Pause" onClick={pauseTimer} styles="hover:bg-neutral-700 focus:bg-neutral-700 active:bg-neutral-700">
              <FaPause className="w-4 h-4 text-white" />
            </Button>
          )}
          <Button variant="icon" aria-label="Stop" onClick={stopTimer} styles="hover:bg-neutral-700 focus:bg-neutral-700 active:bg-neutral-700 " >
            <FaStop className="w-4 h-4 text-white " />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TimerComponent;
