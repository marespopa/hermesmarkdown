"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { useAtom } from "jotai";
import { atom_content } from "@/app/atoms/atoms";
import { FaTimesCircle } from "react-icons/fa";
import Button from "../../Button";

type Props = {
  handleClose: () => void;
};

export default function MobileNavigationLinks({ handleClose }: Props) {
  return (
    <nav
      className={`backdrop-blur	w-full h-full left-0 bg-amber-200 pt-2 pb-4 flex-grow fixed top-0 flex items-center justify-center`}
    >
      <ul className="pt-2 flex flex-col gap-2 items-center w-full">
        <li className={listItemStyle}>
          <NavigationLink label="Home" href="/" action={handleClose} />
        </li>
        <li className={listItemStyle}>
          <NavigationLink
            label="Learn Markdown"
            href="/documentation"
            action={handleClose}
          />
        </li>
        <li className={listItemStyle}>
          <NavigationLink label="FAQ" href="/faq" action={handleClose} />
        </li>
        <li className={`${listItemStyle} mt-4`}>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleClose();
            }}
            className={"flex gap-2 items-center justify-center outline-none w-full"}
          >
            <span>Close Menu</span> <FaTimesCircle />
          </button>
        </li>
      </ul>
    </nav>
  );
}

const listItemStyle = `bg-amber-400 py-2 w-full text-center`;
