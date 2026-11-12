import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingVideo from "./LandingVideo";

describe("LandingVideo", () => {
  it("shows the poster and a button, with no iframe, before play", () => {
    const { container } = render(<LandingVideo />);

    expect(screen.getByRole("img")).toHaveAttribute("src", "/assets/hero/video-poster.jpg");
    expect(screen.getByRole("button", { name: "Watch the video" })).toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("loads the privacy-friendly YouTube embed after one click", () => {
    const { container } = render(<LandingVideo />);

    fireEvent.click(screen.getByRole("button", { name: "Watch the video" }));

    const frame = container.querySelector("iframe");
    expect(frame).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/ZY_8C1YV5BI?autoplay=1",
    );
    expect(frame).toHaveAttribute("title", "HermesMarkdown video");
    expect(screen.queryByRole("button", { name: "Watch the video" })).not.toBeInTheDocument();
  });
});
