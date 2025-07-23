'use client';

import Button from '../components/Button';

export default function ContactPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-neutral-900 text-black dark:text-white font-source-code-pro text-center">
      <h1 className="text-4xl font-extrabold text-amber-500 mt-8">Contact</h1>
      <p className="mt-6 text-lg max-w-xl">
        For any questions, feedback, or support, please email us at
        <br />
        <a
          href="mailto:office@marespopa.com"
          className="text-blue-600 underline hover:text-blue-800 mt-4 inline-block"
        >
          office@marespopa.com
        </a>
      </p>
      <Button
        variant="primary"
        label="Email Us"
        onClick={() => { window.location.href = 'mailto:office@marespopa.com'; }}
        styles="mt-8"
      />
    </div>
  );
} 