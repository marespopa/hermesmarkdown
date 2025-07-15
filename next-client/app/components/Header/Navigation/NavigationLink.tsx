"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useIsMobile from "@/app/hooks/use-is-mobile";

type Props = {
  label: string;
  href: string;
  isEmphasized?: boolean;
  action?: () => void;
};

const NavigationLink = ({
  label,
  href,
  isEmphasized = false,
  action,
}: Props) => {
  const isMobile = useIsMobile();
  const currentRoute = usePathname();
  const isActive =
    href === "/" ? currentRoute === href : currentRoute.startsWith(href);
  const baseLink = "font-bold px-5 py-2 rounded-2xl transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-softyellow dark:focus-visible:ring-white select-none";
  const activeLink = "bg-strongblack dark:bg-white text-white dark:text-black";
  const inactiveLink = "text-strongblack dark:text-white hover:underline focus-visible:underline";

  if (isMobile) {
    return (
      <Link
        href={href}
        onClick={action}
        className={`${baseLink} ${isActive ? activeLink : inactiveLink}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      className={`${baseLink} ${isActive ? activeLink : inactiveLink}`}
      href={href}
      onClick={action}
    >
      {label}
    </Link>
  );
};

export default NavigationLink;
