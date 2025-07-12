"use client";

import React from "react";
import Navbar from "./Navbar";

export default function Header() {
  return (
    <header
      data-testid="GlobalHeader"
      className="bg-white dark:bg-gray-900 text-black dark:text-white py-2 font-mono font-bold"
    >
      <Navbar />
    </header>
  );
}
