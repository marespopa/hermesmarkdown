import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom";
import SettingsButton from "./SettingsButton";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));

describe("SettingsButton", () => {
  beforeEach(() => navigation.push.mockClear());

  it("opens Settings", () => {
    render(<SettingsButton />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(navigation.push).toHaveBeenCalledWith("/editor/settings");
  });
});
