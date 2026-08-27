import { describe, expect, it } from "vitest";
import { findImageAtPos } from "./image-detection";

describe("findImageAtPos", () => {
  it("finds an image and returns its source, alt text, and range", () => {
    const text = "Cover: ![A diagram](images/diagram.png)";
    const start = text.indexOf("!");
    const rawString = "![A diagram](images/diagram.png)";

    expect(findImageAtPos(text, start + 4)).toEqual({
      src: "images/diagram.png",
      alt: "A diagram",
      start,
      end: start + rawString.length,
    });
  });

  it("supports empty alt text and returns null outside an image", () => {
    const text = "![ ](photo.jpg)";
    const end = text.length;

    expect(findImageAtPos(text, 0)).toMatchObject({ src: "photo.jpg", alt: " " });
    expect(findImageAtPos(text, end + 1)).toBeNull();
    expect(findImageAtPos("plain text", 3)).toBeNull();
  });

  it("does not treat a Markdown link as an image", () => {
    expect(findImageAtPos("[diagram](diagram.png)", 4)).toBeNull();
  });
});