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
  const textColor = isActive 
    ? "text-white bg-black underline font-mono font-bold" 
    : "text-black dark:text-white font-mono font-bold";


  if (isMobile) {
    return (
      <Link
        href={href}
        onClick={action}
        className={textColor}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      className={`${textColor} px-2 py-1 rounded-none border-none transition-colors focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800 dark:focus:bg-gray-800 focus:ring-2 focus:ring-amber-100 focus:border-amber-100 hover:border-amber-100 hover:text-black dark:hover:text-white focus:text-black dark:focus:text-white`}
      href={href}
      onClick={action}
    >
      {label}
    </Link>
  );
};

export default NavigationLink;
