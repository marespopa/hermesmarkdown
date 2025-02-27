"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { useAtom } from "jotai";
import { atom_content } from "@/app/atoms/atoms";

type Props = {
  handleClose: () => void;
};

export default function MobileNavigationLinks({ handleClose }: Props) {
  return (
    <nav
      className={`backdrop-blur	w-full fixed top-20 left-0 bg-slate-300   pt-2 pb-4 flex-grow`}
    >
      <ul className="pt-2 flex flex-col md:flex-row space-x-4 gap-8 items-center">
        <li>
          <NavigationLink label="Home" href="/" action={handleClose} />
        </li>
        <li>
          <NavigationLink
            label="Learn Markdown"
            href="/documentation"
            action={handleClose}
          />
        </li>
        <li>
          <NavigationLink
            label="FAQ"
            href="/faq"
            action={handleClose}
          />
        </li>
      </ul>
    </nav>
  );
}
