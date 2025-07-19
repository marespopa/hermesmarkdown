"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  atom_content,
  atom_contentEdited,
  atom_frontMatter,
} from "@/app/atoms/atoms";
import LoadingOverlay from "@/app/components/LoadingOverlay";
import matter from "gray-matter";
import { showSuccessToast, showErrorToast } from "@/app/components/Toastr";
import TemplateSelectionModal from "../../templates/TemplateSelectionModal";
import { StatusResponse } from "@/app/services/save-utils";
import Button from "@/app/components/Button";
import FileInput from "@/app/components/FileInput";
import { FaPlay, FaFile, FaFileAlt, FaFolderOpen } from "react-icons/fa";
import Badge from "@/app/components/Badges/Badge";
import useIsMobile from "@/app/hooks/use-is-mobile";
import { EMPTY_PAGE_TEMPLATE } from "../EditorUtils";
import InfoPanelPlain from "../../components/InfoPanelPlain";

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
  const [, setFrontMatter] = useAtom(atom_frontMatter);
  const [hasExistingFile, setHasExistingFile] = useState(false);
  const [content, setContent] = useAtom(atom_content);
  const [contentEdited, setContentEdited] = useAtom(atom_contentEdited);

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
  const [fileList, _] = useState<File[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const hasContent = contentEdited?.length > 0 || content?.length > 0;
  
    setHasExistingFile(hasContent);
  }, [content, contentEdited]);

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
          {/* Enhanced Header */}
          <h2 className="text-2xl leading-tight text-center mb-4 text-gray-900 dark:text-white">
            🚀 Let&apos;s get started!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
            Choose an option below to begin working with Hermes Markdown.
          </p>

          {/* Buttons Section for Mobile View */}
          <div className="prose dark:prose-invert flex flex-col gap-4 mx-auto">
            {/* Continue File Button */}
            {hasExistingFile && (
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

            {/* Start from Template Button */}
            <div className="flex flex-col items-center">
              {/* Recommended Badge */}
              {!hasExistingFile && (
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

            {/* Blank File Button */}
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

            {/* Open File Button */}
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

            {/* File Input Section (if visible) */}
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
                    setIsLoading(true);
                    handleOpenFileFromInput(selectedFileList[0]);

                    return;
                  }}
                  label="Markdown File"
                  accept=".md, .txt"
                  helperText="Load a markdown file."
                />
              </div>
            )}
          </div>

          {/* Template Selection Modal */}
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

  async function handleOpenFileFromInput(file: File) {
    try {
      if (!file) {
        showErrorToast("File could not be loaded");

        return;
      }
      const text = await file.text();
      setIsLoading(true);
      loadFileData(text, file.name)
        .then(() => {
          router.push("/dashboard/editor");
          showSuccessToast("File has been loaded");
        })
        .catch((error) => {
          showErrorToast("File could not be loaded");
          console.error(error);
        })
        .finally(() => {
          setDisabledButtonsState({
            ...disabledButtonsState,
            existing: false,
          });
          setIsLoading(false);
        });
    } catch (error) {
      console.error(error);
    }
  }

  function renderActions() {
    return (
      <section className="flex gap-4 lg:gap-8 mb-16">
        {hasExistingFile && renderContinueOption()}
        {renderNewFileOption()}
        {renderSelectTemplateOption()}
        {renderImportFileOption()}
      </section>
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
          description={`It seems you have some data stored from the last time you used the app.`}
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
          description={`Pre-built structures for quick starts`}
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
              New File
            </span>
          }
          description={`Begin with an empty document`}
          action={{
            label: "New File",
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
          description={`Edit your existing markdown file`}
          action={{
            label: "Import File",
            handler: () => handleOpenFile(),
            disabled: disabledButtonsState.existing,
          }}
        />
      </div>
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
              Need a quick start? Choose a template and customize it to your
              liking. Want a blank canvas? Start from scratch and let your
              creativity flow. Or, perhaps you have an existing Markdown file
              ready to be polished? Simply open it and edit away.
            </p>
          </>
        )}
      </article>
    );
  }

  function handleCreateFile() {
    setIsLoading(true);
    setFrontMatter({
      fileName: "file",
      title: "File",
      description: "",
      tags: "",
    });
    setContent(EMPTY_PAGE_TEMPLATE);
    setContentEdited(EMPTY_PAGE_TEMPLATE);
    setDisabledButtonsState({ ...disabledButtonsState, new: true });
    router.push("/dashboard/editor");
  }

  async function handleOpenFile() {
    setIsLoading(true);

    try {
      const [fileHandle] = await window.showOpenFilePicker(PICKER_OPTIONS);
      const file = await fileHandle.getFile();

      setDisabledButtonsState({ ...disabledButtonsState, existing: true });

      await parseFile(file);
      showSuccessToast("File has been loaded");
      router.push("/dashboard/editor");
    } catch (error) {
      // Don't show error toast if user cancelled the file picker
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

  function parseFile(file: File): Promise<StatusResponse> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        const fileContent = String(reader.result);
        const result = await loadFileData(fileContent, file.name);
        resolve(result);
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function loadFileData(fileContent: string, fileName: string) {
    const { data: frontMatter, content } = matter(fileContent);

    let setterPromise = loadFileInEditor(fileName, frontMatter, content);

    return setterPromise;
  }

  function loadFileInEditor(
    fileName: string,
    frontMatter: { [key: string]: any },
    content: string
  ) {
    return new Promise<StatusResponse>(function (resolve, reject) {
      try {
        setFrontMatter({
          fileName: fileName || "",
          title: frontMatter?.title || fileName || "Untitled File",
          description: frontMatter?.description || "",
          tags: frontMatter?.tags ? frontMatter?.tags.join(",") : "",
        });
        setContent(content);
        setContentEdited(content);

        resolve({
          status: "success",
          message: "File has been loaded successfully",
        });
      } catch (error) {
        reject({
          status: "error",
          message: error,
        });
      }
    });
  }

  function handleSelectTemplate() {
    setDisabledButtonsState({ ...disabledButtonsState, template: true });
    setIsTemplateSelectModalVisible(true);
  }
}

const panelStyle = "flex-1";
