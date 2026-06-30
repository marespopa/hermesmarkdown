'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from './components/Button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    {/* Sophisticated Ambient Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-sage/[0.05] dark:bg-sage/[0.03] blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
  </div>
);

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface text-fg font-sans selection:bg-sage/30 relative overflow-hidden">
      <BackgroundGraphics />
      <div className="max-w-xl w-full text-center space-y-8 animate-hero-fade-in relative z-10">
        <div className="space-y-2">
          <div className="h-px w-12 bg-amber-500 mx-auto" />
          <p className="text-ui-footnote font-bold uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">
            Error 500
          </p>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-none">
          Something{' '}
          <span className="text-neutral-300 dark:text-neutral-700 italic font-serif">
            went wrong.
          </span>
        </h1>

        <p className="text-neutral-500 dark:text-neutral-400 text-lg leading-relaxed">
          An unexpected error occurred. Your local vault and unsaved drafts are unaffected.
        </p>

        {error.digest && (
          <p className="font-mono text-ui-footnote text-neutral-600 dark:text-neutral-400">
            Digest: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button variant="hero" onClick={reset} className="w-full sm:w-auto px-10">
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outlined" className="w-full sm:w-auto px-10">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
