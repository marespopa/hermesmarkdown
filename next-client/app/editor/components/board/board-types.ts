export interface BoardViewProps {
  /** Vault-relative path of the board note. */
  path: string;
  /** The tab's Markdown text (atom_fileContent). */
  content: string;
  isActivePane?: boolean;
  /** Opens the raw file in the text editor. */
  onEditAsMarkdown: () => void;
}
