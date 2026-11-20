"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import { atom_hasOpenFileContent } from "@/app/atoms/atoms";
import { atom_userName } from "@/app/atoms/ui-atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import TextLink from "@/app/components/TextLink/TextLink.component";
import Toast from "@/app/components/Toast";
import { FiFileText } from "react-icons/fi";
import FloatingStartButton from "./FloatingStartButton";
import LandingThemePicker from "./LandingThemePicker";
import LandingHero from "./LandingHero";
import LandingFeature from "./LandingFeature";
import LandingSpecs from "./LandingSpecs";
import LandingFaq from "./LandingFaq";
import Reveal from "./Reveal";
import {
  LANDING_FEATURES,
  LANDING_FILES,
  LANDING_HEADLINE,
  LANDING_STATEMENT,
  LANDING_STATEMENT_NOTE,
} from "./landing-content";
import { BODY, DISPLAY, H2, SECTION } from "./landing-styles";

export default function LandingPage() {
  const router = useRouter();
  const hasOpenFileContent = useAtomValue(atom_hasOpenFileContent);
  const [userName, setUserName] = useAtom(atom_userName);
  const [nameDraft, setNameDraft] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const heroCtaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    router.prefetch("/editor");
  }, [router]);

  const handleStart = () => {
    if (!userName.trim() && nameDraft.trim()) setUserName(nameDraft.trim());
    setShowLoading(true);
    router.push("/editor");
  };


  return (
    <main className="min-h-screen overflow-x-hidden font-sans selection:bg-sage/30">
      <LoadingOverlay isVisible={showLoading} text="Opening editor..." />

      <Toast
        isVisible={isMounted && hasOpenFileContent}
        icon={<FiFileText size={16} />}
        title={userName.trim() ? `Welcome back, ${userName.trim()}` : "Welcome Back"}
        description="You have a draft waiting in your local vault."
        actionLabel="Resume"
        onAction={handleStart}
        {...(!userName.trim() && {
          nameValue: nameDraft,
          onNameChange: setNameDraft,
          namePlaceholder: "What should we call you?",
        })}
      />

      <LandingHero ctaRef={heroCtaRef} onStart={handleStart} />

      {/* The page's one privacy promise, with its one limit right under it. */}
      <section className={`${SECTION} items-center text-center`} aria-label="Privacy">
        <Reveal className="max-w-5xl">
          <p className={DISPLAY}>{LANDING_STATEMENT}</p>
          <p className="mt-8 text-ui-callout text-fg-muted">
            {LANDING_STATEMENT_NOTE}{" "}
            <TextLink href="#specs" variant="unstyled" className="underline underline-offset-4 hover:text-fg">
              See the specs
            </TextLink>
            .
          </p>
        </Reveal>
      </section>

      {LANDING_FEATURES.map((feature, index) => (
        <LandingFeature key={feature.id} feature={feature} index={index} />
      ))}
      <LandingFeature feature={LANDING_FILES} index={LANDING_FEATURES.length} />

      <section className={SECTION} aria-labelledby="landing-theme">
        <Reveal className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <h2 id="landing-theme" className={H2}>
            Make it yours.
          </h2>
          <p className={`mt-4 ${BODY}`}>Three light and three dark themes.</p>
          <div className="mt-10">
            <LandingThemePicker />
          </div>
        </Reveal>
      </section>

      <LandingSpecs />
      <LandingFaq />

      {/* The sign-off: the headline once more, no button of its own. The
          floating Start writing is already on screen here, so the extra room
          below lets it settle right under the line as the page's last word. */}
      <section
        className="container max-w-screen-xl flex flex-col items-center pb-40 pt-24 text-center md:pb-48 md:pt-32"
        aria-labelledby="landing-close"
      >
        <Reveal>
          <h2 id="landing-close" className={DISPLAY}>
            {LANDING_HEADLINE}
          </h2>
        </Reveal>
      </section>

      <FloatingStartButton heroRef={heroCtaRef} onStart={handleStart} />
    </main>
  );
}
