"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import { atom_hasOpenFileContent } from "@/app/atoms/atoms";
import { atom_userName } from "@/app/atoms/ui-atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import Button from "@/app/components/Button/Button.component";
import TextLink from "@/app/components/TextLink/TextLink.component";
import Toast from "@/app/components/Toast";
import { FiFileText } from "react-icons/fi";
import FloatingStartButton from "./FloatingStartButton";
import LandingThemePicker from "./LandingThemePicker";
import LandingVideo from "./LandingVideo";
import { LANDING_FAQ, LANDING_SCENES } from "./landing-content";

const SECTION = "container max-w-screen-xl border-t border-black/5 py-20 dark:border-white/10";
const H2 = "text-3xl font-bold leading-tight tracking-tight md:text-4xl";
const BODY = "leading-relaxed text-neutral-600 dark:text-neutral-400";

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

      {/* Little room above on a phone, where the hero is taller than the
          screen and its top padding only pushed it below the fold; the small
          viewport height, so the browser's bars don't cut it off. */}
      <section className="container max-w-screen-xl flex min-h-svh flex-col justify-center pb-16 pt-10 sm:pt-14 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-7">
            <p className="text-ui-footnote font-bold uppercase tracking-[0.3em] text-sage dark:text-sage">
              Hermes&middot;Markdown
            </p>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
              Markdown notes and code,{" "}
              <br />
              <span className="text-[var(--link)]">right in your browser.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-xl">
              A local-first editor that saves straight to your device. No
              account, no cloud, nothing to install.
            </p>
            <div ref={heroCtaRef} className="flex flex-col items-start gap-5 pt-2 sm:flex-row sm:items-center">
              <Button
                variant="hero"
                onClick={handleStart}
                className="w-full px-10 sm:w-auto"
              >
                Start Writing
              </Button>
              <TextLink
                href="/documentation"
                variant="unstyled"
                className="inline-flex items-center gap-1.5 text-ui-callout font-semibold text-neutral-600 transition-colors hover:text-fg dark:text-neutral-400 dark:hover:text-fg"
              >
                Read the docs <span aria-hidden="true">→</span>
              </TextLink>
            </div>
            <p className="text-ui-footnote text-fg-faint">
              Private by default. Your work stays in files you control.
            </p>
          </div>
          <LandingVideo />
        </div>
      </section>

      {LANDING_SCENES.map((scene) => (
        <section key={scene.id} className={SECTION} aria-labelledby={`landing-${scene.id}`}>
          <div className="max-w-3xl space-y-4">
            <h2 id={`landing-${scene.id}`} className={H2}>
              {scene.headline}{" "}
              <br />
              <span className="text-[var(--link)]">{scene.accentLine}</span>
            </h2>
            <p className={`text-lg ${BODY}`}>{scene.lead}</p>
          </div>
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {scene.points.map((point) => (
              <li key={point.title} className="space-y-2">
                <h3 className="text-ui-callout font-semibold">{point.title}</h3>
                <p className={BODY}>{point.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className={SECTION} aria-labelledby="landing-theme">
        <div className="max-w-3xl space-y-4">
          <h2 id="landing-theme" className={H2}>
            Pick your paper.
          </h2>
          <p className={`text-lg ${BODY}`}>
            Four light and four dark themes. Change them any time.
          </p>
        </div>
        <div className="mt-10">
          <LandingThemePicker />
        </div>
      </section>

      <section className={SECTION} aria-labelledby="landing-faq">
        <h2 id="landing-faq" className={H2}>
          Questions
        </h2>
        <dl className="mt-10 max-w-3xl space-y-8">
          {LANDING_FAQ.map(({ q, a }) => (
            <div key={q} className="space-y-2">
              <dt className="font-semibold">{q}</dt>
              <dd className={BODY}>{a}</dd>
            </div>
          ))}
        </dl>
        <p className={`mt-12 max-w-3xl ${BODY}`}>
          New to Markdown? Read{" "}
          <TextLink href="/markdown-editor">
            what a Markdown editor is
          </TextLink>
          , try the{" "}
          <TextLink href="/tools">
            free Markdown tools
          </TextLink>
          , or browse the{" "}
          <TextLink href="/documentation">
            documentation
          </TextLink>
          .
        </p>
      </section>

      <FloatingStartButton heroRef={heroCtaRef} onStart={handleStart} />
    </main>
  );
}
