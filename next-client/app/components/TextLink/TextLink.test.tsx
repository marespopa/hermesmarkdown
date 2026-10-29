import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TextLink, { isExternalHref } from "./TextLink.component";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a data-next-link href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("TextLink", () => {
  it("routes site paths through next/link", () => {
    render(<TextLink href="/documentation">docs page</TextLink>);
    const link = screen.getByRole("link", { name: "docs page" });
    expect(link).toHaveAttribute("data-next-link");
    expect(link).toHaveAttribute("href", "/documentation");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens other sites in a new tab without the opener", () => {
    render(<TextLink href="https://example.com/">Example</TextLink>);
    const link = screen.getByRole("link", { name: "Example" });
    expect(link).not.toHaveAttribute("data-next-link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps same-page anchors and mail links in place", () => {
    render(
      <>
        <TextLink href="#templates">Templates</TextLink>
        <TextLink href="mailto:hello@example.com">Mail</TextLink>
      </>,
    );
    for (const name of ["Templates", "Mail"]) {
      const link = screen.getByRole("link", { name });
      expect(link).not.toHaveAttribute("target");
      expect(link).not.toHaveAttribute("data-next-link");
    }
  });

  it("lets the caller override target and rel", () => {
    render(<TextLink href="https://example.com/" target="_self" rel="me">Profile</TextLink>);
    const link = screen.getByRole("link", { name: "Profile" });
    expect(link).toHaveAttribute("target", "_self");
    expect(link).toHaveAttribute("rel", "me");
  });

  it("tells external URLs from site paths", () => {
    expect(isExternalHref("https://example.com")).toBe(true);
    expect(isExternalHref("//cdn.example.com/x")).toBe(true);
    expect(isExternalHref("/privacy-policy")).toBe(false);
    expect(isExternalHref("#top")).toBe(false);
    expect(isExternalHref("mailto:hello@example.com")).toBe(false);
  });
});
