"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  atom_files,
  atom_selectedFileId,
  atom_canOpenMoreFiles,
  OpenFile,
} from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import matter from "gray-matter";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import TemplateSelectionModal from "../../templates/TemplateSelectionModal";
import Button from "@/app/components/Button";
import FileInput from "@/app/components/FileInput";
import { FaPlay, FaFile, FaFileAlt, FaFolderOpen } from "react-icons/fa";
import Badge from "@/app/components/Badges/Badge";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { EMPTY_PAGE_TEMPLATE } from "../EditorUtils";
import InfoPanelPlain from "../../components/InfoPanelPlain";
import { v4 as uuidv4 } from 'uuid';

export const PICKER_OPTIONS: OpenFilePickerOptions = {
  types: [
    {
      description: "MD Files",
      accept: {
        "text/markdown": [".md", ".txt"],
      },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
};

export default function EditorEmpty() {
  const router = useRouter();
  const [files, setFiles] = useAtom(atom_files);
  const [, setSelectedFileId] = useAtom(atom_selectedFileId);
  const [canOpenMoreFiles] = useAtom(atom_canOpenMoreFiles);
  const hasExistingFiles = files.length > 0;

  const [isLoading, setIsLoading] = useState(false);
  const [isFileInputVisible, setIsFileInputVisible] = useState(false);
  const [isTemplateSelectModalVisible, setIsTemplateSelectModalVisible] =
    useState(false);
  const [disabledButtonsState, setDisabledButtonsState] = useState({
    existing: false,
    new: false,
    template: false,
  });
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <></>;
  }

  if (isMobile) {
    return renderMobileView();
  }

  return (
    <div className="px-4">
      {renderHeading()}
      {!isLoading && <>{renderActions()}</>}
      <LoadingOverlay isVisible={isLoading} text={"Hang on tight. The editor is loading..."} />
    </div>
  );

  function renderMobileView() {
    return (
      <article className="my-8">
        <h2 className="text-2xl leading-tight text-center mb-4 text-gray-900 dark:text-white">
          🚀 Let&apos;s get started!
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          Choose an option below to begin working with Hermes Markdown.
        </p>

        <div className="prose dark:prose-invert flex flex-col gap-4 mx-auto">
          {hasExistingFiles && (
            <div className="flex flex-col items-center">
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard/editor")}
                label={
                  <span>
                    <i className="fa fa-play mr-2"></i> Continue
                  </span>
                }
              />
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                Continue from where you left off.
              </p>
            </div>
          )}

          {canOpenMoreFiles && (
            <>
              <div className="flex flex-col items-center">
                {!hasExistingFiles && (
                  <Badge variant="accent" label="Recommended" />
                )}
                <Button
                  isDisabled={disabledButtonsState.template}
                  variant="secondary"
                  onClick={() => handleSelectTemplate()}
                  label={
                    <span>
                      <i className="fa fa-file-alt mr-2"></i> Start from a
                      Template
                    </span>
                  }
                  data-testid="template-btn"
                />
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                  Use pre-built templates to save time and get started quickly.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  isDisabled={disabledButtonsState.new}
                  variant="secondary"
                  onClick={() => handleCreateFile()}
                  label={
                    <span>
                      <i className="fa fa-file mr-2"></i> Blank File
                    </span>
                  }
                  data-testid="blank-file-btn"
                />
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                  Start with a clean slate and create a new markdown file from
                  scratch.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <Button
                  variant="secondary"
                  label={
                    <span>
                      <i className="fa fa-folder-open mr-2"></i> Import File
                    </span>
                  }
                  isDisabled={disabledButtonsState.existing}
                  onClick={() => setIsFileInputVisible(!isFileInputVisible)}
                />
                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
                  Import an existing markdown or text file to edit.
                </p>
              </div>

              {isFileInputVisible && (
                <div className="rounded-b-md flex flex-col -mt-2 gap-2 bg-slate-200 dark:bg-gray-700 p-2">
                  <FileInput
                    name="file"
                    handleChange={(selectedFileList) => {
                      if (!selectedFileList || !selectedFileList[0]) {
                        showErrorToast(
                          "Something went wrong with the file selection. Please try again."
                        );
                        return;
                      }

                      if (!isSelectedFileValid(selectedFileList[0])) {
                        showErrorToast(
                          "The selected file must be a .md or a .txt file."
                        );
                        return;
                      }

                      setIsFileInputVisible(false);
                      setDisabledButtonsState({
                        ...disabledButtonsState,
                        existing: true,
                      });
                      handleOpenFileFromInput(selectedFileList[0]);
                    }}
                    label="Markdown File"
                    accept=".md, .txt"
                    helperText="Load a markdown file."
                  />
                </div>
              )}
            </>
          )}

          {!canOpenMoreFiles && (
            <div className="flex flex-col items-center text-center">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                Maximum 3 files can be open at once
              </p>
              <Button
                variant="secondary"
                onClick={() => router.push("/dashboard/editor")}
                label="View Open Files"
              />
            </div>
          )}
        </div>

        {isTemplateSelectModalVisible && (
          <TemplateSelectionModal
            isOpen={isTemplateSelectModalVisible}
            handleClose={() => {
              setDisabledButtonsState({
                ...disabledButtonsState,
                template: false,
              });
              setIsTemplateSelectModalVisible(false);
            }}
          />
        )}
      </article>
    );
  }

  function isSelectedFileValid(file: File) {
    return file && (file?.name.endsWith(".md") || file?.name.endsWith(".txt"));
  }

  function renderActions() {
    return (
      <section className="flex gap-4 lg:gap-8 mb-16">
        {hasExistingFiles && renderContinueOption()}
        {canOpenMoreFiles && renderNewFileOption()}
        {canOpenMoreFiles && renderSelectTemplateOption()}
        {canOpenMoreFiles && renderImportFileOption()}
        {!canOpenMoreFiles && renderMaxFilesReachedOption()}
      </section>
    );
  }

  function renderHeading() {
    return (
      <article className="my-16">
        <h2 className="text-2xl leading-tight text-gray-900 dark:text-white">Choose Your Path:</h2>
        <h1 className="text-5xl leading-tight text-black dark:text-white">
          Editing Options in <strong>Hermes Markdown</strong>
        </h1>
        {!isLoading && (
          <>
            <p className="w-1/2 my-8 leading-loose text-gray-700 dark:text-gray-300">
              Pick how you want to start. Everything stays local.
            </p>
          </>
        )}
      </article>
    );
  }

  function renderContinueOption() {
    return (
      <div className={panelStyle}>
        <InfoPanelPlain
          title={
            <span className="flex gap-2 items-center">
              <FaPlay />
              Continue
            </span>
          }
          description={`You have files open from the last time you used the app.`}
          action={{
            label: "Continue",
            handler: () => router.push("/dashboard/editor"),
            disabled: false,
          }}
        />
      </div>
    );
  }

  function renderSelectTemplateOption() {
    return (
      <div className={panelStyle}>
        <InfoPanelPlain
          isHighlighted={true}
          title={
            <span className="flex flex-col items-start">
              <Badge variant="warning" label="Recommended" />
              <span className="flex gap-2 items-center">
                <FaFileAlt /> New from Template
              </span>
            </span>
          }
          description={`Grab a pre-made layout for code reviews or system prompts. It saves you the repetitive setup work.`}
          action={{
            label: "Select a Template",
            handler: () => handleSelectTemplate(),
            disabled: disabledButtonsState.template,
          }}
        />

        {isTemplateSelectModalVisible && (
          <TemplateSelectionModal
            isOpen={isTemplateSelectModalVisible}
            handleClose={() => {
              setDisabledButtonsState({
                ...disabledButtonsState,
                template: false,
              });
              setIsTemplateSelectModalVisible(false);
            }}
          ></TemplateSelectionModal>
        )}
      </div>
    );
  }

  function renderNewFileOption() {
    return (
      <div className={panelStyle}>
        <InfoPanelPlain
          title={
            <span className="flex gap-2 items-center">
              <FaFile />
              New
            </span>
          }
          description={`Just a clean, blank page. Perfect for when you just need to get your thoughts down quickly.`}
          action={{
            label: "New",
            handler: () => handleCreateFile(),
            disabled: disabledButtonsState.new,
          }}
        />
      </div>
    );
  }

  function renderImportFileOption() {
    return (
      <div className={panelStyle}>
        <InfoPanelPlain
          title={
            <span className="flex gap-2 items-center">
              <FaFolderOpen />
              Import File
            </span>
          }
          description={`Bring in an existing Markdown file from your computer to edit, update frontmatter, or export to PDF.`}
          action={{
            label: "Import File",
            handler: () => handleOpenFile(),
            disabled: disabledButtonsState.existing,
          }}
        />
      </div>
    );
  }

  function renderMaxFilesReachedOption() {
    return (
      <div className={panelStyle}>
        <InfoPanelPlain
          title={
            <span className="flex gap-2 items-center">
              <FaPlay />
              Files Open
            </span>
          }
          description={`You have 3 files open (maximum). Close a file to open more.`}
          action={{
            label: "View Open Files",
            handler: () => router.push("/dashboard/editor"),
            disabled: false,
          }}
        />
      </div>
    );
  }

  function handleCreateFile() {
    if (!canOpenMoreFiles) {
      showErrorToast("Maximum 3 files can be open at once");
      return;
    }

    setIsLoading(true);
    const newFileId = uuidv4();
    const newFile: OpenFile = {
      id: newFileId,
      content: EMPTY_PAGE_TEMPLATE,
      contentEdited: EMPTY_PAGE_TEMPLATE,
      frontMatter: {
        fileName: "file",
        title: "File",
        description: "",
        tags: "",
      },
      isSaved: true,
    };

    setFiles([...files, newFile]);
    setSelectedFileId(newFileId);
    setDisabledButtonsState({ ...disabledButtonsState, new: true });
    router.push("/dashboard/editor");
  }

  async function handleOpenFile() {
    if (!canOpenMoreFiles) {
      showErrorToast("Maximum 3 files can be open at once");
      return;
    }

    setIsLoading(true);

    try {
      const [fileHandle] = await window.showOpenFilePicker(PICKER_OPTIONS);
      const file = await fileHandle.getFile();

      setDisabledButtonsState({ ...disabledButtonsState, existing: true });

      await parseAndAddFile(file);
      showSuccessToast("File has been loaded");
      router.push("/dashboard/editor");
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      showErrorToast("File could not be loaded");
      console.error('Error opening file:', error);
    } finally {
      setDisabledButtonsState({ ...disabledButtonsState, existing: false });
      setIsLoading(false);
    }
  }

  function parseAndAddFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const fileContent = String(reader.result);
          await loadAndAddFileData(fileContent, file.name);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function handleOpenFileFromInput(file: File) {
    try {
      if (!file) {
        showErrorToast("File could not be loaded");
        return;
      }

      if (!canOpenMoreFiles) {
        showErrorToast("Maximum 3 files can be open at once");
        return;
      }

      const text = await file.text();
      await loadAndAddFileData(text, file.name);

      router.push("/dashboard/editor");
      showSuccessToast("File has been loaded");
    } catch (error) {
      showErrorToast("File could not be loaded");
      console.error(error);
    } finally {
      setDisabledButtonsState({
        ...disabledButtonsState,
        existing: false,
      });
    }
  }

  function loadAndAddFileData(fileContent: string, fileName: string): Promise<void> {
    const { data: frontMatterData, content } = matter(fileContent);

    return new Promise((resolve, reject) => {
      try {
        const newFileId = uuidv4();
        const newFile: OpenFile = {
          id: newFileId,
          content: content,
          contentEdited: content,
          frontMatter: {
            fileName: fileName || "",
            title: frontMatterData?.title || fileName || "Untitled File",
            description: frontMatterData?.description || "",
            tags: frontMatterData?.tags ? frontMatterData?.tags.join(",") : "",
          },
          isSaved: true,
        };

        setFiles([...files, newFile]);
        setSelectedFileId(newFileId);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  function handleSelectTemplate() {
    setDisabledButtonsState({ ...disabledButtonsState, template: true });
    setIsTemplateSelectModalVisible(true);
  }
}

const panelStyle = "flex-1";
