"use client";

import { Provider as JotaiProvider } from "jotai";
import React from "react";
import ThemeProvider from "./ThemeProvider";

type Props = {
  children: React.ReactNode;
};

const CustomProviders = ({ children }: Props) => {
  return (
    <JotaiProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </JotaiProvider>
  );
};

export default CustomProviders;
