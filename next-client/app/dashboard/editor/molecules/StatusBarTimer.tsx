import React from "react";
import useSound from "use-sound";
import { useAtom } from "jotai";
import { atom_timerSettings } from "@/app/atoms/atoms";
import { FaPlay, FaPause, FaStop } from "react-icons/fa";
import { FaRedo } from "react-icons/fa";
import { useTimer } from "@/app/services/useTimer";
import Button from "@/app/components/Button/Button.component";

export const StatusBarTimer = () => {
  const isTest =
    typeof window !== "undefined" && process.env.NODE_ENV === "test";
  const volume = isTest ? 0 : 1;
  const [playSound_stop] = useSound("/resources/sounds/notification.mp3", {
    volume,
  });
  const [playSound_pause] = useSound("/resources/sounds/boop.mp3", { volume });
  const [playSound_start] = useSound("/resources/sounds/start-tick.wav", {
    volume,
  });
  const [timerSettings] = useAtom(atom_timerSettings);
  const { timeLeft, formatTime, isActive, toggle, reset } = useTimer(
    timerSettings.durationInMin,
  );

  // Enhanced toggle and reset to play sounds
  const handleToggle = () => {
    if (isActive) {
      playSound_pause();
    } else {
      playSound_start();
    }
    toggle();
  };
  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playSound_stop();
    reset();
  };

  let timerColor = "text-neutral-500";

  if (timeLeft === 0) {
    timerColor = "text-amber-500";
  }

  return (
    <Button
      variant="bare"
      styles={`flex py-2 items-center tracking-tighter justify-end text-[9px] gap-1 ${timerColor} cursor-pointer`}
      onClick={handleToggle}
      onDoubleClick={handleReset}
      aria-label={isActive ? "Pause timer" : "Start timer"}
    >
      {/* Timer Icon */}
      <span>
        {isActive ? (
          <FaPause className="w-[10px] h-[10px]" />
        ) : timeLeft === 0 ? (
          <FaStop className="w-[10px] h-[10px]" />
        ) : (
          <FaPlay className="w-[10px] h-[10px]" />
        )}
      </span>
      <span>{formatTime()}</span>
      <Button
        variant="bare"
        styles="cursor-pointer ml-1"
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleReset(e); }}
        title="Reset"
        aria-label="Reset timer"
      >
        <FaRedo className="w-[14px] h-[14px]" />
      </Button>
    </Button>
  );
};
