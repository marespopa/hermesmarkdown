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
    ? "text-gray-800 dark:text-white" 
    : "text-gray-500 dark:text-gray-400";

  const emphasizeStyle = isEmphasized
    ? `text-white rounded-sm transition ease-in-out p-2 bg-emerald-600 hover:bg-emerald-700 focus:bg-emerald-700`
    : ``;

  if (isMobile) {
    return (
      <Link
        href={href}
        onClick={action}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      className={`${textColor} underline md:no-underline hover:underline focus:underline ${emphasizeStyle}`}
      href={href}
      onClick={action}
    >
      {label}
    </Link>
  );
};

export default NavigationLink;
