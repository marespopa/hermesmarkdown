"use client";

import React from "react";

interface Props {
  isVisible: boolean;
  label?: string;
}

// Slim indeterminate progress bar pinned to the top of the viewport, for
// short, non-blocking waits (e.g. switching files) where a full-screen veil
// would flash. It fades in only after a short delay, so quick operations show
// nothing, and animates `transform` only so it keeps moving while the main
// thread is busy rendering.
const LoadingBar = ({ isVisible, label = "Loading" }: Props) => {
  if (!isVisible) return null;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-busy="true"
      className="loading-bar-appear pointer-events-none fixed inset-x-0 top-0 z-[90] h-0.5 overflow-hidden"
    >
      <div className="loading-bar-slide h-full w-1/3 bg-accent" />
    </div>
  );
};

export default LoadingBar;
