"use client";

import React from "react";
import Navbar from "./Navbar";

export default function Header() {
  return (
    <header
      data-testid="GlobalHeader"
      className="bg-paper-pale/80 dark:bg-paper-dark/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 sticky top-0 z-[100] py-4"
    >
      <Navbar />
    </header>
  );
}
