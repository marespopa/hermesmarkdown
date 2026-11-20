"use client";

import DemoFrame, { DemoCaret, MARK } from "./DemoFrame";
import { appliedSteps, typedText, useScriptLoop, type ScriptStep } from "./useScriptLoop";

// A diagram block is typed as fenced code (editor-typography.scss
// `.cm-codeblock`); once the caret leaves it, it becomes the drawn diagram in
// the editor's rendered-block frame (editor.scss `.cm-rendered-block`). The
// picture is static inline SVG in Mermaid's own default and dark colours, as
// the editor renders it for a light or dark page: nothing renders at runtime.
export const RENDER_SCRIPT: readonly ScriptStep[] = [
  { type: "```mermaid\nflowchart LR\n  Draft --> Review --> Ship\n```" },
  { pause: 700 },
  { key: "ArrowDown" },
  { pause: 3000 },
];

const BOXES = ["Draft", "Review", "Ship"];

// Mermaid's flowchart: lavender boxes edged in purple on light pages, charcoal
// edged in grey on dark ones; its lines and arrowheads in the ink.
function Diagram() {
  return (
    <svg viewBox="0 0 330 62" className="w-full max-w-sm" data-testid="demo-diagram" style={{ fontFamily: '"trebuchet ms", verdana, arial, sans-serif' }}>
      {BOXES.map((name, i) => (
        <g key={name} transform={`translate(${i * 120 + 1} 1)`}>
          <rect width="88" height="60" rx="0" className="fill-[#ECECFF] stroke-[#9370DB] dark:fill-[#1f2020] dark:stroke-[#cccccc]" strokeWidth="1" />
          <text x="44" y="35" textAnchor="middle" fontSize="15" className="fill-[#333333] dark:fill-[#cccccc]">
            {name}
          </text>
          {i < BOXES.length - 1 && (
            <g className="fill-[#333333] stroke-[#333333] dark:fill-[#d3d3d3] dark:stroke-[#d3d3d3]">
              <path d="M88 30h24" strokeWidth="2" fill="none" />
              <path d="M110 25l8 5-8 5z" stroke="none" />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function DemoRender() {
  const { ref, state } = useScriptLoop(RENDER_SCRIPT);
  const left = appliedSteps(RENDER_SCRIPT, state).some((step) => "key" in step);
  const lines = typedText(RENDER_SCRIPT, state).split("\n");
  const title = <div className="cm-line">The release, start to finish:</div>;
  if (left) {
    return (
      <DemoFrame frameRef={ref} label="A diagram typed as text turns into a drawn diagram once the caret leaves it.">
        {title}
        <div className="cm-rendered-block cm-rendered-block-mermaid">
          <div className="cm-rendered-block-frame">
            <div className="cm-rendered-block-body">
              <Diagram />
            </div>
          </div>
        </div>
        <div className="cm-line">
          <DemoCaret />
        </div>
      </DemoFrame>
    );
  }
  return (
    <DemoFrame frameRef={ref} label="A diagram typed as text turns into a drawn diagram once the caret leaves it.">
      {title}
      {lines.map((text, index) => {
        const edge = index === 0 ? "cm-codeblock-start" : text === "```" ? "cm-codeblock-end" : "";
        return (
          <div key={index} className={`cm-line cm-codeblock ${edge}`}>
            <span className={index === 0 || text === "```" ? MARK : undefined}>{text}</span>
            {index === lines.length - 1 && <DemoCaret />}
          </div>
        );
      })}
    </DemoFrame>
  );
}
