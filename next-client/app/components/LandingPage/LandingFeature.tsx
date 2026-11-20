import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import DemoFiles from "./DemoFiles";
import Reveal from "./Reveal";
import type { LandingDemo, LandingFeature as Feature } from "./landing-content";
import { BODY, EYEBROW, H2, SECTION } from "./landing-styles";

// Below the fold, so each demo's code comes in its own chunk; the server
// still renders its still frame, so the box never shifts.
const DEMOS: Record<LandingDemo, ComponentType> = {
  palette: dynamic(() => import("./DemoPalette")),
  table: dynamic(() => import("./DemoTable")),
  render: dynamic(() => import("./DemoRender")),
  focus: dynamic(() => import("./DemoFocus")),
  files: DemoFiles,
};

/** One chapter: eyebrow, headline and sentence beside its demo, the sides swapping on every other one; on a phone, stacked with the demo first. */
export default function LandingFeature({ feature, index }: { feature: Feature; index: number }) {
  const Demo = DEMOS[feature.demo];
  const flipped = index % 2 === 1;
  return (
    <section className={SECTION} aria-labelledby={`landing-${feature.id}`}>
      <Reveal className="grid items-center gap-10 lg:grid-cols-[2fr_3fr] lg:gap-20">
        <div className={`order-2 max-w-xl space-y-4 ${flipped ? "lg:order-2" : "lg:order-1"}`}>
          <p className={EYEBROW}>{feature.eyebrow}</p>
          <h2 id={`landing-${feature.id}`} className={H2}>
            {feature.title}
          </h2>
          <p className={BODY}>{feature.body}</p>
        </div>
        <div className={`order-1 ${flipped ? "lg:order-1" : "lg:order-2"}`}>
          <Demo />
        </div>
      </Reveal>
    </section>
  );
}
