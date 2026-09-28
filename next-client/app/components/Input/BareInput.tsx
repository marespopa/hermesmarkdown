"use client";

import React, { forwardRef } from "react";

// Unlabelled text input for search boxes and inline fields that style
// themselves entirely via `className` (the labelled `Input` adds its own
// wrapper, label and helper text). Autocomplete is off by default, like `Input`.
const BareInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function BareInput({ type = "text", autoComplete = "off", ...rest }, ref) {
    return <input ref={ref} type={type} autoComplete={autoComplete} {...rest} />;
  },
);

export default BareInput;
