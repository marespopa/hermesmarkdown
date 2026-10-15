"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { atom_hasOpenFileContent } from "@/app/atoms/atoms";
import { atom_resumeRequested, atom_userName } from "@/app/atoms/ui-atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import Button from "@/app/components/Button/Button.component";
import Toast from "@/app/components/Toast";
import { FiFileText } from "react-icons/fi";
import { LANDING_FAQ, LANDING_FEATURES, LANDING_PLATFORMS } from "./landing-content";

const SECTION = "container max-w-screen-xl border-t border-black/5 py-20 dark:border-white/10";
const H2 = "text-2xl font-bold tracking-tight md:text-3xl";
const BODY = "leading-relaxed text-neutral-600 dark:text-neutral-400";

export default function LandingPage() {
  const router = useRouter();
  const hasOpenFileContent = useAtomValue(atom_hasOpenFileContent);
  const [userName, setUserName] = useAtom(atom_userName);
  const [nameDraft, setNameDraft] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const setResumeRequested = useSetAtom(atom_resumeRequested);

  useEffect(() => {
    setIsMounted(true);
    router.prefetch("/editor");
  }, [router]);

  const handleStart = () => {
    if (!userName.trim() && nameDraft.trim()) setUserName(nameDraft.trim());
    setShowLoading(true);
    router.push("/editor");
  };

  // Back to the open tabs, not the home feed the editor would otherwise open.
  const handleResume = () => {
    setResumeRequested(true);
    handleStart();
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
        onAction={handleResume}
        {...(!userName.trim() && {
          nameValue: nameDraft,
          onNameChange: setNameDraft,
          namePlaceholder: "What should we call you?",
        })}
      />

      <section className="container max-w-screen-xl flex min-h-screen flex-col justify-center py-24">
        <div className="max-w-3xl space-y-7">
          <p className="text-ui-footnote font-bold uppercase tracking-[0.3em] text-sage dark:text-sage">
            Hermes&middot;Markdown
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            A place where all you can do is write.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-xl">
            A Markdown editor that runs in your browser and saves straight to
            your device. No accounts, no cloud, nothing between you and the page.
          </p>
          <div className="flex flex-col items-start gap-5 pt-2 sm:flex-row sm:items-center">
            <Button
              variant="hero"
              onClick={handleStart}
              className="w-full px-10 sm:w-auto"
            >
              Start Writing
            </Button>
            <Link
              href="/documentation"
              className="inline-flex items-center gap-1.5 text-ui-callout font-semibold text-neutral-600 transition-colors hover:text-fg dark:text-neutral-400 dark:hover:text-fg"
            >
              Read the docs <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="text-ui-footnote text-neutral-500 dark:text-neutral-500">
            Private by default. Your notes stay in files you control.
          </p>
        </div>
      </section>

      <section className={SECTION} aria-labelledby="landing-features">
        <div className="max-w-3xl space-y-4">
          <h2 id="landing-features" className={H2}>
            A local-first Markdown editor in your browser
          </h2>
          <p className={`text-lg ${BODY}`}>
            HermesMarkdown edits plain Markdown files where they already live.
            There is nothing to install and nothing to sign up for, and your
            notes stay readable by any other editor or tool.
          </p>
        </div>
        <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((feature) => (
            <li key={feature.title} className="space-y-2">
              <h3 className="text-ui-callout font-semibold">{feature.title}</h3>
              <p className={BODY}>{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={SECTION} aria-labelledby="landing-platforms">
        <div className="max-w-3xl space-y-4">
          <h2 id="landing-platforms" className={H2}>
            Works in every modern browser
          </h2>
          <p className={`text-lg ${BODY}`}>
            Where your notes live depends on what the browser allows.
          </p>
        </div>
        <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {LANDING_PLATFORMS.map((platform) => (
            <li key={platform.title} className="space-y-2">
              <h3 className="text-ui-callout font-semibold">{platform.title}</h3>
              <p className={BODY}>{platform.body}</p>
            </li>
          ))}
        </ul>
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
          <Link href="/markdown-editor" className="font-semibold text-fg underline-offset-4 hover:underline">
            what a Markdown editor is
          </Link>
          , try the{" "}
          <Link href="/tools" className="font-semibold text-fg underline-offset-4 hover:underline">
            free Markdown tools
          </Link>
          , or browse the{" "}
          <Link href="/documentation" className="font-semibold text-fg underline-offset-4 hover:underline">
            documentation
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
