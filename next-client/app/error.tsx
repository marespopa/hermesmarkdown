'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from './components/Button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-blue-500/30">
      <div className="max-w-xl w-full text-center space-y-8 animate-hero-fade-in">
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
          <p className="font-mono text-ui-footnote text-neutral-400 dark:text-neutral-600">
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
