'use client';

import Button from './components/Button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-neutral-900 text-black dark:text-white font-source-code-pro text-center">
      <h1 className="text-8xl font-extrabold text-amber-500 mt-8">404</h1>
      <p className="mt-6 text-2xl">Oops! The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-8">
        <Button variant="primary" label="Go Back Home" />
      </Link>
    </div>
  );
}
