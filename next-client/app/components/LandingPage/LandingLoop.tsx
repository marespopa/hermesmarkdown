"use client";

import { useEffect, useState } from "react";

// The home hero's demo: a short, silent loop of a note being typed, drawn by
// the page itself (no video file, no embed, nothing requested). It shows the
// editor's first idea: Markdown marks are visible only on the line being
// edited, and step aside once the caret moves on.
const SCRIPT = "# Trip notes\n\n- Book the train\n- Read the [city guide](guide.md)\n- Pack light";
// A still of the finished note first (also what the server renders), a key
// every KEY_MS, a breath before each Enter, and a rest on the finished note.
const START_MS = 1200;
const KEY_MS = 80;
const LINE_MS = 380;
const HOLD_MS = 3000;
const LINK = /\[([^\]]+)\]\(([^)]+)\)/;

function Line({ text, caret }: { text: string; caret: boolean }) {
  const heading = text.startsWith("# ");
  const body = heading ? text.slice(2) : text;
  const link = LINK.exec(body);
  // Marks are drawn only on the caret's line.
  const mark = (value: string) => (caret ? <span className="text-fg-faint">{value}</span> : null);
  return (
    <div className={heading ? "min-h-8 text-xl font-semibold leading-8 sm:min-h-10 sm:text-2xl sm:leading-10" : "min-h-6 leading-6 sm:min-h-7 sm:leading-7"}>
      {heading && mark("# ")}
      {link ? (
        <>
          {body.slice(0, link.index)}
          {mark("[")}
          <span className="text-[var(--link)]">{link[1]}</span>
          {mark(`](${link[2]})`)}
          {body.slice(link.index + link[0].length)}
        </>
      ) : (
        body
      )}
      {caret && (
        <span
          data-caret
          className="ml-px inline-block h-[1.1em] w-0.5 bg-[var(--caret)] align-text-bottom [animation:blink_1s_step-end_infinite] motion-reduce:[animation:none]"
        />
      )}
    </div>
  );
}

export default function LandingLoop() {
  // How many characters of the script are typed so far.
  const [typed, setTyped] = useState(SCRIPT.length);

  useEffect(() => {
    // Reduced motion keeps the still of the finished note.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let at = 0;
    let timer = 0;
    const tick = () => {
      // A hidden tab waits where it is.
      if (document.hidden) {
        timer = window.setTimeout(tick, HOLD_MS);
        return;
      }
      setTyped(at);
      const done = at >= SCRIPT.length;
      const delay = done ? HOLD_MS : SCRIPT[at] === "\n" ? LINE_MS : KEY_MS;
      at = done ? 0 : at + 1;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, START_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const lines = SCRIPT.slice(0, typed).split("\n");
  return (
    <div
      role="img"
      aria-label="A note being typed: Markdown marks show only on the line being edited."
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-edge bg-surface"
    >
      <div aria-hidden="true" className="whitespace-pre-wrap p-4 text-left text-sm text-fg sm:p-8 sm:text-base">
        {lines.map((text, index) => (
          <Line key={index} text={text} caret={index === lines.length - 1} />
        ))}
      </div>
    </div>
  );
}
