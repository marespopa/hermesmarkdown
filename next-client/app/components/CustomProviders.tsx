"use client";

import { Provider as JotaiProvider, getDefaultStore } from "jotai";
import React from "react";
import ThemeProvider from "./ThemeProvider";

type Props = {
  children: React.ReactNode;
};

const CustomProviders = ({ children }: Props) => {
  return (
    // Explicitly use jotai's default store. Without this, <Provider> creates
    // its own isolated store, so writes from plain-module code (e.g.
    // app/services/ai-status.ts, which uses getDefaultStore()) never reach
    // components rendered here.
    <JotaiProvider store={getDefaultStore()}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </JotaiProvider>
  );
};

export default CustomProviders;
