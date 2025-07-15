import React, { JSX } from "react";

type BadgeVariant = 'accent' | 'standard' | 'outlined' | 'warning';
type Props = {
  label: string | JSX.Element;
  variant: BadgeVariant
};


function Badge({ label, variant }: Props) {
    const variantStyleMap: Record<BadgeVariant, string> = {
        standard: 'bg-white dark:bg-neutral-200 text-black',
        accent: 'bg-amber-100 text-black',
        warning: 'bg-amber-200 text-neutral-900 hover:shadow-none animate-none',
        outlined: 'bg-white border border-amber-400 text-black',
    }

  return (
    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${variantStyleMap[variant]}`}>
      {label}
    </span>
  );
}

export default Badge;
