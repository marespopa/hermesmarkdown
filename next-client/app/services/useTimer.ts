import { useState, useEffect, useCallback } from "react";

export function useTimer(initialMinutes: number = 25) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);

  // Update timer if initialMinutes changes (e.g. settings page changes)
  useEffect(() => {
    setTimeLeft(initialMinutes * 60);
  }, [initialMinutes]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // Trigger a subtle notification/sound here
      if (typeof window !== "undefined" && "Notification" in window) {
        // Only use Notification constructor if not in a Service Worker context
        try {
          if (window.Notification.permission === "granted") {
            new window.Notification("Focus session complete!");
          } else if (window.Notification.permission !== "denied") {
            window.Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new window.Notification("Focus session complete!");
              }
            });
          }
        } catch (e) {
          // Fallback: show alert if Notification fails (e.g., in Turbopack/SSR context)
          alert("Focus session complete!");
        }
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggle = () => setIsActive(!isActive);
  const reset = useCallback(() => {
    setIsActive(false);
    setTimeLeft(initialMinutes * 60);
  }, [initialMinutes]);

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return { timeLeft, formatTime, isActive, toggle, reset };
}
