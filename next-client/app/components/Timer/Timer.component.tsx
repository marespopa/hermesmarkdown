import { FaPause, FaPlay, FaStop, FaTimes, FaGripVertical } from "react-icons/fa";
import Button from "../Button";
import { useEffect, useState, useRef, useCallback } from "react";
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
  // Dragging props
  draggable?: boolean;
  position?: { x: number; y: number };
  onPositionChange?: (pos: { x: number; y: number }) => void;
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
  draggable = false,
  position = { x: 0, y: 0 },
  onPositionChange,
}: Props) => {
  const [, setDocumentTitle] = useDocumentTitle("Hermes Markdown");
  const [inputValue, setInputValue] = useState(String(Math.floor(duration / 60)));
  const [editMode, setEditMode] = useState(false);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse/touch drag start
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!draggable || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Store offset from mouse to element's top-left corner
    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    // Initialize ghost at current position
    setGhostPosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, [draggable]);

  // Handle drag move - update ghost position
  const handleDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    // Calculate new position based on mouse minus offset
    const newX = clientX - dragOffset.current.x;
    const newY = clientY - dragOffset.current.y;
    // Clamp to viewport bounds
    const maxX = window.innerWidth - 120;
    const maxY = window.innerHeight - 100;
    setGhostPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY)),
    });
  }, [isDragging]);

  // Handle drag end - commit position
  const handleDragEnd = useCallback(() => {
    if (ghostPosition && onPositionChange) {
      onPositionChange({ x: ghostPosition.x, y: ghostPosition.y });
    }
    setIsDragging(false);
    setGhostPosition(null);
  }, [ghostPosition, onPositionChange]);

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  // Global mouse/touch move and up handlers
  useEffect(() => {
    if (!isDragging) return;
    
    const onMouseMove = (e: MouseEvent) => handleDrag(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleDrag(touch.clientX, touch.clientY);
    };
    const onTouchEnd = () => handleDragEnd();
    
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("touchend", onTouchEnd);
    
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

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

  // Timer content (reused for both main and ghost)
  const timerContent = (isGhost = false) => (
    <div className={`rounded-lg border px-4 py-2 flex flex-col items-center shadow-sm bg-neutral-800 border-neutral-700 text-white dark:bg-neutral-700 dark:text-white relative ${draggable ? "pt-6" : ""} ${isGhost ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Drag handle */}
      {draggable && (
        <div
          className={`absolute -top-0 left-0 right-0 h-5 cursor-move flex items-center justify-center rounded-t-lg bg-neutral-700 dark:bg-neutral-600 ${!isGhost ? "hover:bg-neutral-600 dark:hover:bg-neutral-500" : ""} transition-colors`}
          onMouseDown={!isGhost ? onMouseDown : undefined}
          onTouchStart={!isGhost ? onTouchStart : undefined}
          title="Drag to move"
        >
          <FaGripVertical className="w-3 h-3 text-neutral-400 rotate-90" />
        </div>
      )}
      {onClose && !isGhost && (
        <IconButton
          variant="icon"
          aria-label="Close timer"
          onClick={onClose}
          className="absolute top-2 right-2"
        >
          <FaTimes className="w-4 h-4 text-white" />
        </IconButton>
      )}
      {!isTimerCounting && editMode && !isGhost ? (
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
            if (!isTimerCounting && !isGhost) setEditMode(true);
          }}
          title={!isGhost ? "Click to set minutes" : undefined}
        >
          {formatTime(mainTime)}
        </div>
      )}
      <div className="flex gap-1 mt-1">
        {!isTimerCounting && (
          <Button variant="icon" aria-label="Start" onClick={!isGhost ? startTimer : undefined}
            styles="hover:bg-neutral-700 focus:bg-neutral-700 active:bg-neutral-700">
            <FaPlay className="w-4 h-4 text-white" />
          </Button>
        )}
        {isTimerCounting && (
          <Button variant="icon" aria-label="Pause" onClick={!isGhost ? pauseTimer : undefined} styles="hover:bg-neutral-700 focus:bg-neutral-700 active:bg-neutral-700">
            <FaPause className="w-4 h-4 text-white" />
          </Button>
        )}
        <Button variant="icon" aria-label="Stop" onClick={!isGhost ? stopTimer : undefined} styles="hover:bg-neutral-700 focus:bg-neutral-700 active:bg-neutral-700 " >
          <FaStop className="w-4 h-4 text-white " />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Main timer */}
      <div 
        ref={containerRef}
        className="flex flex-col items-center"
        style={draggable ? {
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 100,
          userSelect: isDragging ? "none" : undefined,
          opacity: isDragging ? 0.4 : 1,
          transition: isDragging ? "none" : "opacity 0.2s",
        } : undefined}
      >
        {timerContent(false)}
      </div>
      
      {/* Ghost timer while dragging */}
      {isDragging && ghostPosition && (
        <div 
          className="flex flex-col items-center pointer-events-none"
          style={{
            position: "fixed",
            left: ghostPosition.x,
            top: ghostPosition.y,
            zIndex: 101,
          }}
        >
          {timerContent(true)}
        </div>
      )}
    </>
  );
};

export default TimerComponent;
