"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue } from "jotai";
import { atom_hasOpenFileContent } from "@/app/atoms/atoms";
import { atom_userName } from "@/app/atoms/ui-atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";
import Button from "@/app/components/Button/Button.component";
import Toast from "@/app/components/Toast";
import { FiFileText } from "react-icons/fi";

export default function LandingPage() {
  const router = useRouter();
  const hasOpenFileContent = useAtomValue(atom_hasOpenFileContent);
  const [userName, setUserName] = useAtom(atom_userName);
  const [nameDraft, setNameDraft] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
    <main className="min-h-screen overflow-x-hidden font-display selection:bg-sage/30">
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

      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-24">
        <div className="max-w-3xl space-y-7">
          <p className="text-ui-footnote font-bold uppercase tracking-[0.3em] text-sage dark:text-sage">
            Hermes&middot;Markdown
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            A place where all you can do is write.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-xl">
            A Markdown editor that runs in your browser and saves straight to
            disk. No accounts, no cloud, nothing between you and the page.
          </p>
          <div className="flex flex-col items-start gap-5 pt-2 sm:flex-row sm:items-center">
            <Button
              variant="hero"
              onClick={handleStart}
              className="w-full px-10 sm:w-auto"
            >
              Open a Local Folder &amp; Write
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
    </main>
  );
}
