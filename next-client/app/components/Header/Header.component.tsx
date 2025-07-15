"use client";

import React from "react";
import Navbar from "./Navbar";

export default function Header() {
  return (
    <header
      data-testid="GlobalHeader"
      className="text-strongblack dark:text-white py-3 px-4 font-bold"
    >
      <Navbar />
    </header>
  );
}
