"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HiSparkles, HiArrowRight } from "react-icons/hi";
import Button from "@/app/components/Button";

export default function Hero() {
  const router = useRouter();
  const heroImage = "/assets/hero/niceday@2x.jpg";

  return (
    <div className="relative bg-white dark:bg-black overflow-hidden">
      <div className="container max-w-7xl mx-auto">
        
        {/* The Hero "Master Card" */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 bg-amber-50/50 dark:bg-zinc-900/40 p-8 md:p-16 transition-all duration-500 hover:border-zinc-200 dark:hover:border-zinc-700">
          
          {/* Decorative subtle glow to match Features */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/5 dark:bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative">
            
            {/* Left Column: Content */}
            <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
              
              {/* Badge matching the 'Capabilities' style */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-8">
                <HiSparkles className="text-amber-500 dark:text-sky-400" />
                Privacy-Focused Editor
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] text-zinc-900 dark:text-zinc-50">
                Write Better <br />
                <span className="text-zinc-400 dark:text-zinc-500">AI Prompts,</span> Faster.
              </h1>

              <p className="text-lg md:text-xl mt-8 text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium max-w-lg">
                Draft high-clarity requests with professional templates. 
                Private by design. Professional by default.
              </p>

              <div className="mt-10 w-full flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                <Button
                  styles="w-full sm:w-auto px-10 py-4 rounded-full shadow-lg transition-all active:scale-95 bg-zinc-900 dark:bg-sky-500 text-white dark:text-white border-none hover:bg-zinc-700"
                  variant="hero"
                  onClick={() => router.push("/dashboard")}
                >
                  <span className="text-xl font-bold flex items-center gap-2">
                    Launch Editor <HiArrowRight className="text-sm opacity-50" />
                  </span>
                </Button>
                
                <button 
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  See Capabilities ↓
                </button>
              </div>
            </div>

            {/* Right Column: Hero Image (The Display Card) */}
            <div className="w-full lg:w-1/2">
              <div className="relative group">
                {/* Image Frame matching the Bento icons' depth */}
                <div className="relative bg-white dark:bg-zinc-800 p-2 rounded-[2rem] shadow-2xl border border-zinc-200/50 dark:border-white/5 transition-transform duration-700 group-hover:scale-[1.02]">
                  <Image
                    className="rounded-[1.6rem] object-cover border border-zinc-100 dark:border-zinc-900"
                    src={heroImage}
                    alt="Hermes Markdown Editor Preview"
                    height={800}
                    width={1200}
                    priority={true}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom spacer to lead into features */}
        <div className="mt-12 flex justify-center">
            <div className="h-12 w-px bg-gradient-to-b from-zinc-200 dark:from-zinc-800 to-transparent" />
        </div>

      </div>
    </div>
  );
}
