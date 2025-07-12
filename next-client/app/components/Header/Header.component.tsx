"use client";

import React from "react";
import Navbar from "./Navbar";

export default function Header() {
  return (
    <header
      data-testid="GlobalHeader"
      className="bg-amber-100 dark:bg-gray-800 sm:px-2 text-gray-900 dark:text-gray-100 py-4 shadow-sm"
    >
      <Navbar />
    </header>
  );
}
