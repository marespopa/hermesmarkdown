"use client";

import React from "react";
import NavigationLink from "./NavigationLink";
import { FaTimesCircle } from "react-icons/fa";
import ThemeToggle from "../../ThemeToggle";

type Props = {
  handleClose: () => void;
};

export default function MobileNavigationLinks({ handleClose }: Props) {
  return (
    <nav
      className={`backdrop-blur w-full h-screen left-0 bg-white dark:bg-gray-800 fixed top-0 flex items-center justify-center`}
    >
      <ul className="flex flex-col gap-4 items-center w-full max-w-sm px-4">
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
          <div className="flex items-center justify-center w-full">
            <ThemeToggle />
          </div>
        </li>
        <li className={`${listItemStyle} mt-2`}>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleClose();
            }}
            className={"flex gap-2 items-center justify-center outline-none w-full text-gray-900 dark:text-gray-100"}
          >
            <span>Close Menu</span> <FaTimesCircle />
          </button>
        </li>
      </ul>
    </nav>
  );
}

const listItemStyle = `bg-gray-100 dark:bg-gray-700 py-3 w-full text-center rounded-md`;
