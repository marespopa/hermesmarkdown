import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import WelcomeWizard from "./WelcomeWizard";
import { atom_hasCompletedOnboarding, atom_isWizardOpen } from "@/app/atoms/ui-atoms";
import { atom_vaultHandle } from "@/app/atoms/vault-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import { testAIConnection } from "@/app/services/ai";

// Mock hooks
vi.mock("@/app/hooks/use-file-system", () => ({
  useFileSystem: vi.fn(),
}));

vi.mock("@/app/services/ai", () => ({
  testAIConnection: vi.fn(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const HydrateAtoms = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const TestProvider = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
);

describe("WelcomeWizard", () => {
  const mockOpenVault = vi.fn();

  const defaultInitialValues: any = [
    [atom_hasCompletedOnboarding, false],
    [atom_isWizardOpen, true],
    [atom_vaultHandle, null],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    (useFileSystem as any).mockReturnValue({
      openVault: mockOpenVault,
      isVaultSupported: true,
    });
  });

  it("advances preference steps when Enter is pressed", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={1} />
      </TestProvider>
    );

    fireEvent.keyDown(window, { key: "Enter" });

    expect(screen.getByText("Make the editor feel like paper")).toBeInTheDocument();
  });

  it("offers GitHub vault connection during vault setup", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={0} />
      </TestProvider>
    );

    expect(screen.getByRole("button", { name: "Connect GitHub Vault" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").slice(-3).map((button) => button.textContent))
      .toEqual(expect.arrayContaining([
        expect.stringContaining("Create New Vault"),
        expect.stringContaining("Open Existing Vault"),
        expect.stringContaining("Connect GitHub Vault"),
      ]));
    expect(screen.getAllByRole("button").at(-1)).toHaveAccessibleName("Connect GitHub Vault");
  });

  it("advances to the theme step automatically if a vault is already connected", async () => {
    const connectedValues = [
      ...defaultInitialValues.filter(([a]: any) => a !== atom_vaultHandle),
      [atom_vaultHandle, { name: "TestVault" }],
    ];

    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={0} />
      </TestProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Theme")).toBeInTheDocument();
    });
  });

  it("shows showcase step when finishing preferences", async () => {
    const connectedValues = [
      ...defaultInitialValues.filter(([a]: any) => a !== atom_vaultHandle),
      [atom_vaultHandle, { name: "TestVault" }],
    ];

    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={1} />
      </TestProvider>
    );

    expect(screen.getByText("Theme")).toBeInTheDocument();

    // Steps 1-6 (Theme, paper-like font, Line Numbers, Vim Mode,
    // Autosave, AI Features) each advance one step at a time via their own
    // "Continue" button before reaching the final step (7).
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByText("Continue"));
    }

    await waitFor(() => {
      expect(screen.getByText("You're ready to write.")).toBeInTheDocument();
    });
  });

  it("replaces the test button with a connection confirmation after success", async () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard initialStep={6} />
      </TestProvider>
    );

    fireEvent.change(screen.getByLabelText("welcome-ai-key"), { target: { value: "test-key" } });
    (testAIConnection as any).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByText("Test Connection"));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Connection successful.");
    });
    expect(screen.queryByText("Test Connection")).not.toBeInTheDocument();
  });
});
