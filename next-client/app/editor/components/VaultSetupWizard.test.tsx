import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import VaultSetupWizard from "./VaultSetupWizard";
import {
  atom_frontmatterWizardOpen,
  atom_vaultSetupWizardOpen,
  atom_vaultHandle,
  atom_vaultSetupStatus
} from "@/app/atoms/atoms";
import { LATEST_AGENT_VERSION } from "@/app/utils/agent-version";

// Helper to hydrate atoms for testing
const HydrateAtoms = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => {
  useHydrateAtoms(initialValues);
  return children;
};

const TestProvider = ({ initialValues, children }: { initialValues: any, children: React.ReactNode }) => (
  <Provider>
    <HydrateAtoms initialValues={initialValues}>{children}</HydrateAtoms>
  </Provider>
);

describe("VaultSetupWizard", () => {
  const mockVaultHandle = {
    getDirectoryHandle: vi.fn(),
    getFileHandle: vi.fn(),
  };

  const defaultInitialValues = [
    [atom_vaultSetupWizardOpen, "test.md"],
    [atom_frontmatterWizardOpen, null],
    [atom_vaultHandle, mockVaultHandle],
    [atom_vaultSetupStatus, "needs_setup"],
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders setup step when vault needs setup and wizard is open", async () => {
    // Mock getFileHandle to throw (file missing)
    mockVaultHandle.getFileHandle.mockRejectedValue(new Error("NotFoundError"));

    render(
      <TestProvider initialValues={defaultInitialValues}>
        <VaultSetupWizard />
      </TestProvider>
    );

    expect(screen.getByText("Vault Setup")).toBeInTheDocument();
    
    // Wait for the async check to complete
    await waitFor(() => {
      expect(screen.getByText("_agent-context.md")).toBeInTheDocument();
    });
  });

  it("handles installation and advances to frontmatter wizard", async () => {
    const mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    // First call (check) fails, subsequent calls (install) succeed
    mockVaultHandle.getFileHandle
      .mockRejectedValueOnce(new Error("NotFoundError"))
      .mockRejectedValueOnce(new Error("NotFoundError"))
      .mockRejectedValueOnce(new Error("NotFoundError"))
      .mockResolvedValue({
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      });
      
    mockVaultHandle.getDirectoryHandle.mockResolvedValue(mockVaultHandle);

    render(
      <TestProvider initialValues={defaultInitialValues}>
        <VaultSetupWizard />
      </TestProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Install & Continue")).toBeEnabled();
    });

    const installButton = screen.getByText("Install & Continue");
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockWritable.write).toHaveBeenCalled();
    });
  });

  it("skips and advances to frontmatter wizard", async () => {
    mockVaultHandle.getFileHandle.mockRejectedValue(new Error("NotFoundError"));

    render(
      <TestProvider initialValues={defaultInitialValues}>
        <VaultSetupWizard />
      </TestProvider>
    );

    const skipButton = screen.getByText("Skip");
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(window.localStorage.getItem("hermesSkipVaultSetup")).toBe(LATEST_AGENT_VERSION);
    });
  });
});
