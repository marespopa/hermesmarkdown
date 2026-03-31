"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  label: string;
  href: string;
  action?: () => void;
};

const NavigationLink = ({ label, href, action }: Props) => {
  const currentRoute = usePathname();
  const isActive =
    href === "/" ? currentRoute === href : currentRoute.startsWith(href);

  const baseLink = `
    inline-flex items-center justify-center
    px-4 py-1.5 
    text-sm font-medium transition-all duration-200 
    rounded-full select-none outline-none
  `;

  const activeLink = `
    bg-neutral-900 text-white 
    dark:bg-white dark:text-neutral-900
  `;

  const inactiveLink = `
    text-neutral-500 hover:text-neutral-900 
    dark:text-neutral-400 dark:hover:text-white
    hover:bg-neutral-100 dark:hover:bg-neutral-800
  `;

  return (
    <Link
      href={href}
      onClick={action}
      className={`${baseLink} ${isActive ? activeLink : inactiveLink}`}
    >
      {label}
    </Link>
  );
};

export default NavigationLink;
