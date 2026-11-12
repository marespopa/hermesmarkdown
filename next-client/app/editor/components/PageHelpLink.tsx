"use client";

import React from "react";
import { HiOutlineQuestionMarkCircle } from "react-icons/hi";
import CornerButton from "./CornerButton";

export interface PageHelp {
  /** The page's section of the documentation, e.g. `/documentation#tasks-page`. */
  href: string;
  /** What the section explains, for the tooltip ("How to use Tasks"). */
  label: string;
}

// A small (?) at the top right of an /editor page (ShellPage's title bar):
// a link to that page's section of the documentation, with what it explains
// as its tooltip. A CornerButton, as every button of the editor's
// top-right row.
export default function PageHelpLink({ href, label }: PageHelp) {
  return <CornerButton icon={<HiOutlineQuestionMarkCircle size={14} aria-hidden />} label={`Help: ${label}`} tooltip={label} href={href} />;
}
