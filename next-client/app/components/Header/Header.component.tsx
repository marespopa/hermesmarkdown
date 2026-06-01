"use client";

import React from "react";
import Navbar from "./Navbar";

export default function Header() {
  return (
    <header
      data-testid="GlobalHeader"
      className="bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 sticky top-0 z-[100] py-4"
    >
      <Navbar />
    </header>
  );
}
