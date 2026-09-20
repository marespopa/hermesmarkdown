"use client";

import { useCallback, useEffect, useState } from "react";
import { useAtom } from "jotai";
import Button from "@/app/components/Button";
import DialogModal from "@/app/components/DialogModal/DialogModal";
import Input from "@/app/components/Input";
import { atom_githubVaultDialogOpen } from "@/app/atoms/ui-atoms";
import { useFileSystem } from "@/app/hooks/use-file-system";
import type { GitHubVaultDescriptor, GitHubVaultRemoteFile } from "@/app/services/github-vault-workspace";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string | null;
  private: boolean;
}

interface TreeResponse {
  repository: Omit<GitHubVaultDescriptor, "kind" | "version">;
  files: GitHubVaultRemoteFile[];
}

const repositoryNameIsValid = (name: string) =>
  /^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/.test(name);

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "GitHub request failed.");
  return body;
}

export default function GitHubVaultDialog() {
  const [isOpen, setIsOpen] = useAtom(atom_githubVaultDialogOpen);
  const { initGitHubVault } = useFileSystem();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [repositoryName, setRepositoryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const close = () => {
    if (isLoading || isCreating) return;
    setIsOpen(false);
    setError(null);
  };

  const loadRepositories = useCallback(async (requestedPage = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await responseJson(await fetch("/api/github/auth/session", { cache: "no-store" }));
      if (!session.authenticated) {
        window.location.assign(new URL("/api/github/auth/login", window.location.origin));
        return;
      }
      const result = await responseJson(await fetch(
        `/api/github/repos?page=${requestedPage}&perPage=100`,
        { cache: "no-store" },
      )) as { repositories?: Repository[]; hasNextPage?: boolean };
      const nextRepositories = Array.isArray(result.repositories) ? result.repositories : [];
      setRepositories((previous) => requestedPage === 1
        ? nextRepositories
        : [...previous, ...nextRepositories.filter((next) => !previous.some((item) => item.id === next.id))]);
      setPage(requestedPage);
      setHasNextPage(result.hasNextPage === true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GitHub is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void loadRepositories();
  }, [isOpen, loadRepositories]);

  const selectRepository = async (repository: Pick<Repository, "owner" | "name">) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await responseJson(await fetch(
        `/api/github/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/tree`,
        { cache: "no-store" },
      )) as TreeResponse;
      const descriptor: GitHubVaultDescriptor = {
        ...result.repository,
        kind: "github",
        version: 1,
      };
      await initGitHubVault(descriptor, result.files);
      setIsOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GitHub vault could not be opened.");
    } finally {
      setIsLoading(false);
    }
  };

  const createRepository = async () => {
    if (!repositoryNameIsValid(repositoryName)) {
      setError("Use 1–100 letters, numbers, periods, hyphens, or underscores.");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const result = await responseJson(await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: repositoryName }),
      }));
      const repository = result.repository as Repository;
      setRepositoryName("");
      setRepositories((previous) => [repository, ...previous.filter((item) => item.id !== repository.id)]);
      await selectRepository(repository);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "GitHub repository could not be created.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <DialogModal isOpened={isOpen} onClose={close} styles="!max-w-lg" ariaLabelledBy="github-vault-title">
      <div className="space-y-5">
        <div>
          <h2 id="github-vault-title" className="text-ui-title-3 font-bold">Connect GitHub Vault</h2>
          <p className="mt-1 text-ui-footnote text-fg-muted">
            Choose a repository or create a new private vault. Only Markdown and .hermes files are imported.
          </p>
        </div>

        <div className="flex gap-2 items-end">
          <Input
            name="github-repository-name"
            label="New private repository"
            value={repositoryName}
            handleChange={(event) => setRepositoryName(event.target.value)}
            placeholder="my-notes"
            disabled={isLoading || isCreating}
          />
          <Button
            variant="primary"
            className="shrink-0 mb-2"
            onClick={() => void createRepository()}
            disabled={!repositoryName || isLoading || isCreating}
          >
            {isCreating ? "Creating…" : "Create"}
          </Button>
        </div>

        {error && <p role="alert" className="text-ui-footnote text-red-600">{error}</p>}

        <div className="max-h-64 overflow-y-auto rounded-xl border border-edge">
          {isLoading && repositories.length === 0 ? (
            <p className="p-4 text-ui-footnote text-fg-muted">Loading repositories…</p>
          ) : repositories.length === 0 ? (
            <p className="p-4 text-ui-footnote text-fg-muted">No repositories yet. Create a private vault above.</p>
          ) : (
            repositories.map((repository) => (
              <Button
                key={repository.id}
                variant="menu-item"
                className="rounded-none text-left"
                onClick={() => void selectRepository(repository)}
                disabled={isLoading || isCreating}
              >
                <span className="min-w-0">
                  <span className="block truncate">{repository.fullName}</span>
                  <span className="block text-ui-caption text-fg-faint">
                    {repository.private ? "Private" : "Public"}{repository.defaultBranch ? ` · ${repository.defaultBranch}` : ""}
                  </span>
                </span>
              </Button>
            ))
          )}
        </div>
        {hasNextPage && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void loadRepositories(page + 1)}
            disabled={isLoading || isCreating}
          >
            Load more repositories
          </Button>
        )}
      </div>
    </DialogModal>
  );
}
