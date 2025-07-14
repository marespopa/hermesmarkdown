import React, { useEffect, useState, useCallback, type JSX } from "react";
import useSound from "use-sound";
import TimerComponent from "./Timer.component";

interface Props {
  settings: {
    workSessionDurationInMin: number; // minutes
    shortBreakSessionDurationInMin: number; // minutes
    longBreakSessionDurationInMin: number; // minutes
  };
  onClose?: () => void;
}

export function TimerContainer({ settings, onClose }: Props): JSX.Element {
  // Mute sounds in Cypress or test environment
  const isTest = typeof window !== "undefined" && (window.Cypress || process.env.NODE_ENV === "test");
  const volume = isTest ? 0 : 1;

  const [playSound_stop] = useSound("/resources/sounds/notification.mp3", { volume });
  const [playSound_pause] = useSound("/resources/sounds/boop.mp3", { volume });
  const [playSound_start] = useSound("/resources/sounds/start-tick.wav", { volume });
  const [playSound_reset] = useSound("/resources/sounds/reset.wav", { volume });

  const pomodoroTime = settings.workSessionDurationInMin * 60;
  const shortRestTime = settings.shortBreakSessionDurationInMin * 60;
  const longRestTime = settings.longBreakSessionDurationInMin * 60;
  const cycles = 4;

  // Timestamp-based timer state
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pauseTime, setPauseTime] = useState<number>(0);
  const [isTimerCounting, setIsTimerCounting] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [cyclesStateManager, setCyclesStateManager] = useState(
    new Array(cycles - 1).fill(true)
  );

  const [completedCycles, setCompletedCycles] = useState(0);
  const [fullWorkingTime, setFullWorkingTime] = useState(0);
  const [numberOfPomodoros, setNumberOfPomodoros] = useState(0);
  const [currentTime, setCurrentTime] = useState(pomodoroTime);

  // Calculate remaining time based on timestamps
  const getRemainingTime = useCallback(() => {
    if (!startTime || !isTimerCounting) {
      return pomodoroTime;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - startTime) / 1000) - pauseTime;
    const totalDuration = isWorking ? pomodoroTime : (isResting ? (cyclesStateManager.length === 0 ? longRestTime : shortRestTime) : pomodoroTime);
    const remaining = Math.max(0, totalDuration - elapsed);
    
    return remaining;
  }, [startTime, isTimerCounting, pauseTime, isWorking, isResting, pomodoroTime, shortRestTime, longRestTime, cyclesStateManager]);

  // Update current time every second when timer is running
  useEffect(() => {
    if (!isTimerCounting) {
      setCurrentTime(getRemainingTime());
      return;
    }

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      setCurrentTime(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerCounting, getRemainingTime]);

  const resetPomodoro = useCallback(() => {
    setIsTimerCounting(false);
    setIsWorking(false);
    setIsResting(false);
    setStartTime(null);
    setPauseTime(0);
    setCompletedCycles(0);
    setCyclesStateManager(new Array(cycles - 1).fill(true));
    setNumberOfPomodoros(0);
    setFullWorkingTime(0);
    playSound_reset();
  }, [cycles, playSound_reset]);

  const startWorkInterval = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    setIsTimerCounting(true);
    setIsWorking(true);
    setIsResting(false);
    setPauseTime(0);
    playSound_start();
    
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [playSound_start]);

  const startRestInterval = useCallback((long: boolean) => {
    const now = Date.now();
    setStartTime(now);
    setIsTimerCounting(true);
    setIsWorking(false);
    setIsResting(true);
    setPauseTime(0);
    playSound_stop();
  }, [playSound_stop]);

  // Update timer display every second
  useEffect(() => {
    if (!isTimerCounting) return;

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      
      // Add a small buffer (0.5 seconds) to account for JavaScript timing inconsistencies
      if (remaining <= 0.5) {
        // Timer finished
        if (isWorking && cyclesStateManager.length > 0) {
          startRestInterval(false);
          cyclesStateManager.pop();
        } else if (isWorking && cyclesStateManager.length <= 0) {
          startRestInterval(true);
          setCyclesStateManager(new Array(cycles - 1).fill(true));
          setCompletedCycles(completedCycles + 1);
        }

        if (isWorking) {
          setNumberOfPomodoros(numberOfPomodoros + 1);
        }

        if (isResting) {
          startWorkInterval();
        }

        // Show notification if browser supports it
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Pomodoro Timer', {
            body: isWorking ? 'Work session completed! Time for a break.' : 'Break completed! Time to work.',
            icon: '/icon.png'
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerCounting, isWorking, isResting, cyclesStateManager, numberOfPomodoros, completedCycles, getRemainingTime, startRestInterval, startWorkInterval]);

  const togglePauseFn = useCallback((): (() => void) => {
    return () => {
      if (isTimerCounting) {
        // Pause
        const currentElapsed = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
        setPauseTime(pauseTime + currentElapsed);
        setIsTimerCounting(false);
        playSound_pause();
      } else {
        // Resume
        setStartTime(Date.now());
        setIsTimerCounting(true);
        playSound_start();
      }
    };
  }, [isTimerCounting, pauseTime, startTime, playSound_pause, playSound_start]);

  const timerProps = {
    isWorking,
    isResting,
    isTimerCounting,
    mainTime: currentTime,
    startWorkInterval,
    startRestInterval,
    resetPomodoro,
    togglePauseFn,
    numberOfPomodoros,
    completedCycles,
    onClose,
  };

  return <TimerComponent {...timerProps} />;
}
