import React, { type AnchorHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";

type TextLinkVariant =
  // A link inside running text: ink, underlined, the underline darkening on
  // hover. Not the accent, which is kept for the caret, focus and selection.
  | "inline"
  // Inherits the surrounding colour and darkens to ink on hover (footers,
  // fine print).
  | "quiet"
  // No visual styling beyond the shared focus ring: for links that style
  // themselves entirely through `className` (badges, cards, nav items).
  | "unstyled";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
  variant?: TextLinkVariant;
  className?: string;
};

const FOCUS =
  "rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const VARIANT_CLASSES: Record<TextLinkVariant, string> = {
  inline: `font-medium text-fg underline decoration-edge underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-fg ${FOCUS}`,
  quiet: `transition-colors duration-150 hover:text-fg ${FOCUS}`,
  unstyled: FOCUS,
};

// Site pages go through next/link (client navigation, prefetch); anchors on
// the same page, mail and other sites are plain links, and other sites open
// in a new tab without passing on the opener.
export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//.test(href);
}

const TextLink = React.forwardRef<HTMLAnchorElement, Props>(function TextLink(
  { href, children, variant = "inline", className = "", target, rel, ...rest },
  ref,
) {
  const classes = `${VARIANT_CLASSES[variant]} ${className}`.trim();
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link ref={ref} href={href} target={target} rel={rel} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  const external = isExternalHref(href);
  return (
    <a
      ref={ref}
      href={href}
      target={target ?? (external ? "_blank" : undefined)}
      rel={rel ?? (external ? "noopener noreferrer" : undefined)}
      className={classes}
      {...rest}
    >
      {children}
    </a>
  );
});

export default TextLink;
