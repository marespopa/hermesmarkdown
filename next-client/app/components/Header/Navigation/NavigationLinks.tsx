"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { useAtom } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import ThemeToggle from "../../ThemeToggle";

type Props = {};

export default function NavigationLinks({}: Props) {
  const [content] = useAtom(atom_content);
  return (
    <nav className="ml-auto" data-testid="navigation">
      <ul className="flex flex-col md:flex-row space-x-4 gap-8 items-center">
        <li>
          <NavigationLink label="Home" href="/" />
        </li>
        <li>
          <NavigationLink label="Learn Markdown" href="/documentation" />
        </li>
        <li>
          <NavigationLink label="FAQ" href="/faq" />
        </li>
        <li>
          <ThemeToggle />
        </li>
      </ul>
    </nav>
  );
}
