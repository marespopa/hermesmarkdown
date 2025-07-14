import React, { JSX } from "react";

type BadgeVariant = 'success' | 'danger' | 'info';
type Props = {
  label: string | JSX.Element;
  variant: BadgeVariant
};


function Badge({ label, variant }: Props) {
    const variantStyleMap: Record<BadgeVariant, string> = {
        success: 'bg-amber-100 text-amber-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-sky-100 text-sky-700'
    }

  return (
    <span className={`${variantStyleMap[variant]} px-2 py-1 rounded-sm text-xs font-bold mb-1 animate-pop -mt-4`}>
      {label}
    </span>
  );
}

export default Badge;
