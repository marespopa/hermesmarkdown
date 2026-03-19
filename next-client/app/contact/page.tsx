'use client';

import React from 'react';
import Button from '../components/Button';
import { HiEnvelope, HiChatBubbleLeftRight, HiArrowUpRight, HiUserCircle } from "react-icons/hi2";

export default function ContactPage() {
  const email = "office@marespopa.com";

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center bg-white dark:bg-black selection:bg-amber-200 dark:selection:bg-sky-500/30 overflow-hidden px-6">
      
      {/* Dynamic Background Glow: Amber on light, Sky on dark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] 
                      bg-amber-500/5 dark:bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Apple-style Super-header */}
        <div className="flex flex-col items-center text-center mb-12">
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Get in touch.
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
            Have questions about Hermes? I’m building this in the open and would love to hear your thoughts.
          </p>
        </div>

        {/* The Contact Card */}
        <div className="group relative bg-zinc-50/50 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-12 transition-all duration-500 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm">
          <div className="flex flex-col items-center">
            {/* Persona Icon */}
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center mb-6 
                            text-amber-500 dark:text-sky-400">
              <HiUserCircle size={40} />
            </div>

            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Talk to the Creator
            </h2>
            
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-center max-w-xs">
              I don't have a big support team yet, but I personally read and reply to every message as soon as I can.
            </p>

            <a
              href={`mailto:${email}`}
              className="group/link flex items-center gap-2 text-xl md:text-2xl font-medium 
                         text-zinc-900 dark:text-zinc-100 
                         hover:text-amber-600 dark:hover:text-sky-400 
                         transition-colors underline-offset-8 decoration-zinc-300 dark:decoration-zinc-700 
                         hover:decoration-amber-500 dark:hover:decoration-sky-500"
            >
              {email}
              <HiArrowUpRight className="text-sm opacity-0 group-hover/link:opacity-100 transition-all -translate-y-1 translate-x-1" />
            </a>

            <div className="mt-10 w-full sm:w-auto">
              <Button
                variant="hero"
                onClick={() => { window.location.href = `mailto:${email}`; }}
                styles="w-full sm:px-12 py-4 rounded-full shadow-lg active:scale-95 transition-transform 
                        bg-amber-100 dark:bg-sky-500 text-black dark:text-white"
              >
                <span className="font-semibold">Send a Message</span>
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
