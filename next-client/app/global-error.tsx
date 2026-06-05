'use client';

import { useEffect } from 'react';
import Button from './components/Button';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center px-6 bg-white text-neutral-900 font-sans">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-2">
            <div className="h-px w-12 bg-amber-500 mx-auto" />
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-600">
              Critical Error
            </p>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-none">
            Something{' '}
            <span className="text-neutral-300 italic" style={{ fontFamily: 'Georgia, serif' }}>
              went wrong.
            </span>
          </h1>

          <p className="text-neutral-500 text-lg leading-relaxed">
            The application encountered a critical error. Refreshing usually fixes this.
          </p>

          {error.digest && (
            <p className="font-mono text-xs text-neutral-400">
              Digest: {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="primary"
              onClick={reset}
              className="!px-10 !rounded-full"
            >
              Try Again
            </Button>
            <Button
              variant="secondary"
              onClick={() => { window.location.href = '/'; }}
              className="!px-10 !rounded-full"
            >
              Go Home
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
