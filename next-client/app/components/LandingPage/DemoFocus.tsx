"use client";

import { Fragment } from "react";
import DemoFrame, { DemoCaret } from "./DemoFrame";
import { appliedSteps, typedText, useScriptLoop, type ScriptStep } from "./useScriptLoop";

// Focus with Focus Dimming, as flow-mode.ts draws it: the other paragraphs
// and the other sentences of the one being written fade to a quarter, over
// 200ms, and the fade follows the caret as typing moves on.
export const FOCUS_SCRIPT: readonly ScriptStep[] = [
  { pause: 800 },
  { key: "Focus" },
  { pause: 700 },
  { key: "Enter" },
  { type: "Next we tag the build. Then we announce it." },
  { pause: 2800 },
];

const FIRST = "The release is planned for Friday.";
const SECOND = "Export and themes are done. The docs still need a pass.";

// Sentences of a paragraph; a trailing space after a full stop starts the next, empty one.
function sentences(text: string): string[] {
  const parts: string[] = [...(text.match(/[^.!?]+[.!?]*\s*/g) ?? [])];
  if (/[.!?]\s+$/.test(text)) parts.push("");
  return parts;
}

export default function DemoFocus() {
  const { ref, state } = useScriptLoop(FOCUS_SCRIPT);
  const applied = appliedSteps(FOCUS_SCRIPT, state);
  const focus = applied.some((step) => "key" in step && step.key === "Focus");
  const newParagraph = applied.some((step) => "key" in step && step.key === "Enter");
  const paragraphs = [FIRST, newParagraph ? typedText(FOCUS_SCRIPT, state) : SECOND];
  const dim = (on: boolean) => (focus && on ? "opacity-25" : "") + " transition-opacity duration-200 motion-reduce:transition-none";
  return (
    <DemoFrame frameRef={ref} label="Focus mode: everything but the sentence being written fades out.">
      {paragraphs.map((text, index) => {
        const current = index === paragraphs.length - 1;
        const parts = sentences(text);
        return (
          <Fragment key={index}>
            {index > 0 && (
              <div className="cm-line">
                <br />
              </div>
            )}
            <p className={`cm-line ${dim(!current)}`}>
              {parts.map((part, i) => (
                <span key={i} className={dim(current && i < parts.length - 1)}>
                  {part}
                </span>
              ))}
              {current && <DemoCaret />}
            </p>
          </Fragment>
        );
      })}
    </DemoFrame>
  );
}
