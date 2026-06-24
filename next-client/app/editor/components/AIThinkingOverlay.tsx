"use client";

import React, { useEffect, useState, useRef } from "react";
import Portal from "../../components/Portal/Portal";

const MESSAGES = [
  "Reading between the lines…",
  "Weighing every word…",
  "Finding the signal in the noise…",
  "Polishing the prose…",
  "Untangling the draft…",
  "Listening to the text…",
  "Sharpening the edges…",
  "Choosing the right words…",
  "Following the thread…",
  "Building the argument…",
  "Rethinking the structure…",
  "Connecting the dots…",
  "Looking for clarity…",
  "Assembling the pieces…",
  "Thinking in paragraphs…",
  "Tracing the logic…",
  "Drafting with care…",
  "Finding the rhythm…",
];

function pickRandom(exclude?: string): string {
  const pool = exclude ? MESSAGES.filter((m) => m !== exclude) : MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function AIThinkingOverlay() {
  const [message, setMessage] = useState(() => pickRandom());
  const [visible, setVisible] = useState(true);
  const currentRef = useRef(message);
  currentRef.current = message;

  useEffect(() => {
    const cycle = () => {
      setVisible(false);
      setTimeout(() => {
        setMessage(pickRandom(currentRef.current));
        setVisible(true);
      }, 350);
    };

    const id = setInterval(cycle, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center cursor-wait"
        role="status"
        aria-label="AI is generating"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-md animate-in fade-in duration-300" />

        {/* Card */}
        <div className="relative z-10 flex flex-col items-center gap-3 px-8 py-6 bg-paper-light/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-paper-light/20 dark:border-neutral-800/50 rounded-[28px] animate-in fade-in zoom-in-95 duration-300 select-none max-w-[22rem] w-full mx-4">
          {/* Thinking dots */}
          <div className="flex items-center gap-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-sage dark:bg-sage"
                style={{
                  animation: `aiDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Cycling message */}
          <p
            className="text-ui-footnote text-ink-muted dark:text-stone text-center leading-snug"
            style={{
              opacity: visible ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          >
            {message}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(1); opacity: 0.4; }
          40%            { transform: scale(1.5); opacity: 1; }
        }
      `}</style>
    </Portal>
  );
}
