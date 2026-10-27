"use client";

import React from "react";
import Button from "@/app/components/Button";

type ButtonProps = React.ComponentProps<typeof Button>;

interface ActionButtonProps extends Omit<ButtonProps, "children" | "label" | "variant"> {
  /** `small` unless given. */
  variant?: ButtonProps["variant"];
  icon: React.ReactNode;
  label: React.ReactNode;
  /** This button's action is under way: disabled, and its icon becomes a spinner after a moment. */
  pending?: boolean;
}

// A Templates page action: its icon and label, disabled while it (or
// another action on the same item) runs. The spinner takes the icon's place
// only after ~150ms (`.loading-bar-appear`), so a quick action shows nothing.
export default function ActionButton({ icon, label, pending = false, isDisabled, variant = "small", ...props }: ActionButtonProps) {
  return (
    <Button variant={variant} isDisabled={pending || isDisabled} aria-busy={pending || undefined} {...props}>
      {pending ? (
        <span aria-hidden="true" className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          <span className="loading-bar-appear h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" />
        </span>
      ) : (
        icon
      )}
      {label}
    </Button>
  );
}
