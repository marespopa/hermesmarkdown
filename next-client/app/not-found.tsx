'use client';

import Link from 'next/link';
import Button from './components/Button';

const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    {/* Minimalist Grid Pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    
    {/* Sophisticated Ambient Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-gradient-radial from-sage/[0.05] dark:from-sage/[0.03] via-transparent to-transparent blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
    
    {/* Focus Lines (Vertical accents) */}
    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-neutral-200 dark:via-neutral-800 to-transparent opacity-20" />
  </div>
);

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface text-fg font-sans selection:bg-sage/30 relative overflow-hidden">
      <BackgroundGraphics />
      <div className="max-w-xl w-full text-center space-y-8 animate-hero-fade-in relative z-10">
        <div className="space-y-2">
          <div className="h-px w-12 bg-sage mx-auto" />
          <p className="text-ui-footnote font-bold uppercase tracking-[0.3em] text-sage dark:text-sage">
            Error 404
          </p>
        </div>

        <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-none">
          Page{' '}
          <span className="text-neutral-300 dark:text-neutral-700 italic font-serif">
            not found.
          </span>
        </h1>

        <p className="text-neutral-500 dark:text-neutral-400 text-lg leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/">
            <Button variant="hero" className="w-full sm:w-auto px-10">
              Go Home
            </Button>
          </Link>
          <Link href="/editor">
            <Button variant="outlined" className="w-full sm:w-auto px-10">
              Open Editor
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
