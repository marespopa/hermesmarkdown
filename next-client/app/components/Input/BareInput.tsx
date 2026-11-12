"use client";

import React, { forwardRef } from "react";
import { NO_AUTOFILL } from "./no-autofill";

// Unlabelled text input for search boxes and inline fields that style
// themselves entirely via `className` (the labelled `Input` adds its own
// wrapper, label and helper text). Autofill is off by default, like `Input`.
const BareInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function BareInput({ type = "text", ...rest }, ref) {
    return <input ref={ref} type={type} {...NO_AUTOFILL} {...rest} />;
  },
);

export default BareInput;
