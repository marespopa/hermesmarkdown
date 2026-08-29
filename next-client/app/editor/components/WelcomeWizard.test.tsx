import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import WelcomeWizard from "./WelcomeWizard";
import { atom_hasCompletedOnboarding, atom_isWizardOpen, atom_userName } from "@/app/atoms/ui-atoms";
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
    [atom_userName, ""],
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

  it("renders the welcome step first", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    expect(screen.getByText("Welcome to HermesMarkdown")).toBeInTheDocument();
  });

  it("requires a name before starting vault setup", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    expect(screen.getByText("Set up vault")).toBeDisabled();
  });

  it("advances to connection step when entering a name and clicking Set up vault", () => {
    render(
      <TestProvider initialValues={defaultInitialValues}>
        <WelcomeWizard />
      </TestProvider>
    );

    fireEvent.change(screen.getByLabelText("welcome-user-name"), { target: { value: "  Ada  " } });
    fireEvent.click(screen.getByText("Set up vault"));
    expect(screen.getByText("Connect Your Vault")).toBeInTheDocument();
    expect(window.localStorage.getItem("userName")).toBe(JSON.stringify("Ada"));
  });

  it("advances to the theme step automatically if vault is already connected in step 1", async () => {
    const connectedValues = [
      ...defaultInitialValues.filter(([a]: any) => a !== atom_vaultHandle),
      [atom_vaultHandle, { name: "TestVault" }],
    ];

    render(
      <TestProvider initialValues={connectedValues}>
        <WelcomeWizard initialStep={1} />
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
        <WelcomeWizard initialStep={2} />
      </TestProvider>
    );

    expect(screen.getByText("Theme")).toBeInTheDocument();

    // Steps 2-7 (Theme, Pick your writing font, Line Numbers, Autosave,
    // Frontmatter View, AI Features) each advance one step at a time via
    // their own "Continue" button before reaching the final showcase step (8).
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
        <WelcomeWizard initialStep={7} />
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
