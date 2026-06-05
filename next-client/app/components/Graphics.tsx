"use client";

import React from "react";

export const FilesystemGraphic = () => {
  const year = new Date().getFullYear();
  return (
  <div className="w-full h-full flex items-center justify-center p-6 relative">
    <div className="font-mono text-[11px] leading-relaxed text-left select-none w-full max-w-[260px]">
      <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-semibold mb-1">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        hermes_vault/
      </div>
      <div className="border-l border-neutral-300 dark:border-neutral-700 ml-[6px] pl-3 space-y-1">
        <div className="flex items-center gap-1.5 opacity-60">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          daily-notes.md
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          project-ideas.md
        </div>
        <div className="flex items-center gap-1.5 text-blue-400 dark:text-blue-500 opacity-80">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          journal/
        </div>
        <div className="border-l border-neutral-300 dark:border-neutral-700 ml-[6px] pl-3 space-y-1">
          <div className="flex items-center gap-1.5 opacity-40">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {year}-01.md
          </div>
          <div className="flex items-center gap-1.5 opacity-40">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            {year}-02.md
          </div>
        </div>
      </div>
    </div>
    <div className="absolute top-4 right-4 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      <span className="text-[9px] font-mono uppercase tracking-widest text-blue-500 dark:text-blue-400 opacity-70">Connected</span>
    </div>
  </div>
  );
};

export const ZenModeGraphic = () => {
  const lines = [
    "40%", "65%", "45%", "85%", "35%",
    "70%",
    "60%", "45%", "75%", "40%", "55%",
  ];
  const focusIndex = 5;
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-10 relative overflow-hidden group/zen">
      {/* Dynamic Background Blur */}
      <div className="absolute inset-0 bg-gradient-to-b from-white dark:from-[#050505] via-transparent to-white dark:to-[#050505] pointer-events-none z-10" />
      
      <div className="w-full space-y-3 relative z-0">
        {lines.map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ${
                i === focusIndex
                  ? "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] opacity-100"
                  : "bg-neutral-200 dark:bg-neutral-800 opacity-20 group-hover/zen:opacity-30"
              }`}
              style={{ width: w }}
            />
            {i === focusIndex && (
              <div className="w-0.5 h-4 bg-purple-500 animate-[blink_1s_step-end_infinite] shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            )}
          </div>
        ))}
      </div>

      {/* Focus Ring / Ambient Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 bg-purple-500/10 blur-2xl rounded-full pointer-events-none -z-10" />

      <div className="absolute top-4 right-4 z-20">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400 font-bold opacity-60">Zen Mode</span>
      </div>
    </div>
  );
};

export const PrivacyGraphic = () => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-5 relative select-none">
    <div className="relative">
      <svg width="72" height="56" viewBox="0 0 72 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70 dark:opacity-60">
        <rect x="2" y="2" width="68" height="42" rx="4" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="2" y1="44" x2="70" y2="44" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="28" y1="44" x2="28" y2="54" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="44" y1="44" x2="44" y2="54" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" />
        <line x1="20" y1="54" x2="52" y2="54" className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="2" strokeLinecap="round" />
        <circle cx="36" cy="23" r="3" className="fill-neutral-300 dark:fill-neutral-600" />
      </svg>
      <div className="absolute -bottom-2 -right-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4 6v6c0 5.5 3.4 10.7 8 12 4.6-1.3 8-6.5 8-12V6L12 2z" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1.5" />
          <path d="M9 12l2 2 4-4" className="stroke-emerald-500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <div className="relative opacity-25">
          <svg width="22" height="16" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-neutral-500 dark:stroke-neutral-400" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18 10h1a4 4 0 0 0 0-8h-.5A6 6 0 1 0 6 8.5" />
            <path d="M6 10H5a3 3 0 0 0 0 6h13a3 3 0 0 0 .9-.1" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[26px] h-0.5 bg-neutral-500 dark:bg-neutral-400 rotate-45 rounded-full" />
          </div>
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-ping"
          style={{
            top: `${[10, 30, 55][i]}%`,
            left: `${[10, 80, 45][i]}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: "2s",
          }}
        />
      ))}
    </div>
    <div className="text-[9px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 opacity-60">
      · No Cloud · No Servers · No Tracking ·
    </div>
  </div>
);

export const SmartSyntaxGraphic = () => (
  <div className="w-full h-full flex items-center justify-center p-6 relative select-none">
    <div className="font-mono text-[11px] leading-loose text-left w-full max-w-[280px] space-y-0.5">
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500">#urgn</span>
        <span className="opacity-50">Fix auth token refresh</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">#prog</span>
        <span className="opacity-50">Redesign landing page</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-1.5 rounded text-[10px] font-bold bg-green-500/15 text-green-500">#done</span>
        <span className="opacity-50">Update README</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="opacity-50">- Hosting: $120</div>
      <div className="opacity-50">- Design: $340</div>
      <div className="flex items-center gap-1.5">
        <span className="opacity-50">Total:</span>
        <span className="text-amber-500 font-semibold">$460.00</span>
        <span className="text-[9px] opacity-30">← auto</span>
      </div>

      <div className="h-px bg-neutral-300 dark:bg-neutral-700 opacity-40 my-1" />

      <div className="flex items-center gap-1.5">
        <span className="opacity-50">Sprint ends</span>
        <span className="border-b border-amber-500/60 text-amber-500">2026-06-14</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 opacity-70">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
    </div>
    <div className="absolute top-4 right-4">
      <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500 opacity-60">Smart Syntax</span>
    </div>
  </div>
);

export const BackgroundGraphics = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none" aria-hidden="true">
    {/* Minimalist Grid Pattern */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    
    {/* Sophisticated Ambient Glows */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1000px] bg-gradient-radial from-blue-500/[0.05] dark:from-blue-500/[0.03] via-transparent to-transparent blur-[120px]" />
    <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-purple-500/[0.03] dark:bg-purple-500/[0.02] rounded-full blur-[100px]" />
    <div className="absolute bottom-[20%] left-[5%] w-[600px] h-[600px] bg-amber-500/[0.02] dark:bg-amber-500/[0.01] rounded-full blur-[120px]" />
    
    {/* Focus Lines (Vertical accents) */}
    <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-neutral-200 dark:via-neutral-800 to-transparent opacity-20" />
  </div>
);
