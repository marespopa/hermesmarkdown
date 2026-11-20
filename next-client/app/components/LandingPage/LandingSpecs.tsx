import { LANDING_SPECS } from "./landing-content";
import { H2, SECTION } from "./landing-styles";

/** The plain facts and trade-offs, once, in a quiet two-column list with hairline rows. */
export default function LandingSpecs() {
  return (
    <section id="specs" className={SECTION} aria-labelledby="landing-specs">
      <div className="mx-auto w-full max-w-3xl">
        <h2 id="landing-specs" className={H2}>
          Specs
        </h2>
        <dl className="mt-12 border-t border-edge-subtle">
          {LANDING_SPECS.map(({ label, value }) => (
            <div key={label} className="grid gap-1 border-b border-edge-subtle py-5 sm:grid-cols-[10rem_1fr] sm:gap-8">
              <dt className="font-semibold">{label}</dt>
              <dd className="leading-relaxed text-fg-muted">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
