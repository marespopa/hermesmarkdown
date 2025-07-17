import React, { useEffect, useState, useCallback, type JSX } from "react";
import useSound from "use-sound";
import TimerComponent from "./Timer.component";
import { useAtom } from "jotai";
import { atom_timerSessionState, atom_pomodoroDragging } from "@/app/atoms/atoms";

export function TimerContainer({ onClose, fileName }: { onClose?: () => void; fileName?: string }): JSX.Element {
  const isTest = typeof window !== "undefined" && (window.Cypress || process.env.NODE_ENV === "test");
  const volume = isTest ? 0 : 1;

  const [playSound_stop] = useSound("/resources/sounds/notification.mp3", { volume });
  const [playSound_pause] = useSound("/resources/sounds/boop.mp3", { volume });
  const [playSound_start] = useSound("/resources/sounds/start-tick.wav", { volume });

  const [timerSession, setTimerSession] = useAtom(atom_timerSessionState);
  const [currentTime, setCurrentTime] = useState(timerSession.duration);

  // Calculate remaining time based on timestamps
  const getRemainingTime = useCallback(() => {
    let elapsed = timerSession.pauseTime;
    if (timerSession.isTimerCounting && timerSession.startTime) {
      const now = Date.now();
      elapsed += Math.floor((now - timerSession.startTime) / 1000);
    }
    const remaining = Math.max(0, timerSession.duration - elapsed);
    return remaining;
  }, [timerSession]);

  // Update current time every second when timer is running
  useEffect(() => {
    if (!timerSession.isTimerCounting) {
      setCurrentTime(getRemainingTime());
      return;
    }
    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setCurrentTime(remaining);
      if (remaining <= 0) {
        setTimerSession((prev) => ({
          ...prev,
          isTimerCounting: false,
          startTime: null,
          pauseTime: 0,
        }));
        playSound_stop();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSession.isTimerCounting, getRemainingTime, setTimerSession, playSound_stop]);

  const startTimer = useCallback(() => {
    setTimerSession((prev) => ({
      ...prev,
      startTime: Date.now(),
      isTimerCounting: true,
      // pauseTime is not reset here, so timer resumes from where it left off
    }));
    playSound_start();
  }, [setTimerSession, playSound_start]);

  const pauseTimer = useCallback(() => {
    if (!timerSession.isTimerCounting || !timerSession.startTime) return;
    const now = Date.now();
    const elapsed = Math.floor((now - timerSession.startTime) / 1000);
    setTimerSession((prev) => ({
      ...prev,
      pauseTime: prev.pauseTime + elapsed,
      isTimerCounting: false,
      startTime: null,
    }));
    playSound_pause();
  }, [timerSession, setTimerSession, playSound_pause]);

  const stopTimer = useCallback(() => {
    setTimerSession((prev) => ({
      ...prev,
      startTime: null,
      pauseTime: 0,
      isTimerCounting: false,
    }));
    setCurrentTime(timerSession.duration);
    playSound_stop();
  }, [setTimerSession, timerSession.duration, playSound_stop]);

  const setDuration = useCallback((minutes: number) => {
    const duration = Math.max(1, Math.min(120, minutes)) * 60;
    setTimerSession((prev) => ({
      ...prev,
      duration,
      startTime: null,
      pauseTime: 0,
      isTimerCounting: false,
    }));
    setCurrentTime(duration);
  }, [setTimerSession]);

  const timerProps = {
    isTimerCounting: timerSession.isTimerCounting,
    mainTime: currentTime,
    startTimer,
    pauseTimer,
    stopTimer,
    setDuration,
    duration: timerSession.duration,
    onClose,
    fileName,
  };

  return <TimerComponent {...timerProps} />;
}
