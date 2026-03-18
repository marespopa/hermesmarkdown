"use client";

import React, { useState, useEffect } from "react";
import Button from "@/app/components/Button";
import { FaPlus, FaTrash, FaTable } from "react-icons/fa";
import DialogModal from "@/app/components/DialogModal";

interface TableCell {
  content: string;
}

interface TableRow {
  cells: TableCell[];
}

interface TableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (markdownTable: string) => void;
  onReplaceTable?: (oldTable: string, newTable: string) => void; // For editing existing tables
  initialTable?: string; // Optional markdown table to edit
  currentContent?: string; // Current editor content to detect existing tables
}

const TableEditorModal: React.FC<TableEditorModalProps> = ({
  isOpen,
  onClose,
  onInsertTable,
  onReplaceTable,
  initialTable,
  currentContent,
}) => {
  const [table, setTable] = useState<TableRow[]>([]);
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [existingTableText, setExistingTableText] = useState("");

  // Parse initial markdown table if provided
  useEffect(() => {
    if (initialTable) {
      const parsedTable = parseMarkdownTable(initialTable);
      if (parsedTable.length > 0) {
        setTable(parsedTable);
        setRows(parsedTable.length);
        setColumns(parsedTable[0]?.cells.length || 3);
        setIsEditingExisting(true);
        setExistingTableText(initialTable);
      }
    } else {
      // Initialize with default table
      initializeTable(3, 3);
      setIsEditingExisting(false);
      setExistingTableText("");
    }
  }, [initialTable, isOpen]);

  const parseMarkdownTable = (markdown: string): TableRow[] => {
    const lines = markdown.trim().split('\n');
    const tableRows: TableRow[] = [];
    
    for (const line of lines) {
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line
          .slice(1, -1) // Remove leading and trailing |
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => !cell.match(/^[-:]+$/)); // Filter out separator rows
        
        if (cells.length > 0) {
          tableRows.push({
            cells: cells.map(content => ({ content }))
          });
        }
      }
    }
    
    return tableRows;
  };

  const detectExistingTables = (content: string): string[] => {
    const lines = content.split('\n');
    const tables: string[] = [];
    let currentTable: string[] = [];
    let inTable = false;
    
    for (const line of lines) {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (!inTable) {
          inTable = true;
        }
        currentTable.push(line);
      } else if (inTable && line.trim() === '') {
        // Empty line after table, end the table
        if (currentTable.length > 0) {
          tables.push(currentTable.join('\n'));
          currentTable = [];
        }
        inTable = false;
      } else if (inTable && !line.trim().startsWith('|')) {
        // Non-table line, end the table
        if (currentTable.length > 0) {
          tables.push(currentTable.join('\n'));
          currentTable = [];
        }
        inTable = false;
      }
    }
    
    // Don't forget the last table if we're still in one
    if (inTable && currentTable.length > 0) {
      tables.push(currentTable.join('\n'));
    }
    
    return tables;
  };

  const initializeTable = (numRows: number, numCols: number) => {
    const newTable: TableRow[] = [];
    for (let i = 0; i < numRows; i++) {
      const row: TableRow = {
        cells: Array(numCols).fill(null).map(() => ({ content: "" }))
      };
      newTable.push(row);
    }
    setTable(newTable);
  };

  const updateCell = (rowIndex: number, colIndex: number, content: string) => {
    const newTable = [...table];
    newTable[rowIndex].cells[colIndex].content = content;
    setTable(newTable);
  };

  const addRow = () => {
    const newTable = [...table];
    const newRow: TableRow = {
      cells: Array(columns).fill(null).map(() => ({ content: "" }))
    };
    newTable.push(newRow);
    setTable(newTable);
    setRows(rows + 1);
  };

  const removeRow = (rowIndex: number) => {
    if (table.length > 1) {
      const newTable = table.filter((_, index) => index !== rowIndex);
      setTable(newTable);
      setRows(rows - 1);
    }
  };

  const addColumn = () => {
    const newTable = table.map(row => ({
      ...row,
      cells: [...row.cells, { content: "" }]
    }));
    setTable(newTable);
    setColumns(columns + 1);
  };

  const removeColumn = (colIndex: number) => {
    if (columns > 1) {
      const newTable = table.map(row => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== colIndex)
      }));
      setTable(newTable);
      setColumns(columns - 1);
    }
  };

  const generateMarkdownTable = (): string => {
    if (table.length === 0) return "";

    const markdownRows: string[] = [];
    
    // Add header row
    const headerCells = table[0].cells.map(cell => cell.content || " ");
    markdownRows.push(`| ${headerCells.join(" | ")} |`);
    
    // Add separator row with proper alignment
    const separatorCells = headerCells.map(() => "---");
    markdownRows.push(`| ${separatorCells.join(" | ")} |`);
    
    // Add data rows (skip first row as it's the header)
    for (let i = 1; i < table.length; i++) {
      const cells = table[i].cells.map(cell => cell.content || " ");
      markdownRows.push(`| ${cells.join(" | ")} |`);
    }
    
    return markdownRows.join('\n');
  };

  const handleInsert = () => {
    const markdownTable = generateMarkdownTable();
    if (isEditingExisting && onReplaceTable) {
      onReplaceTable(existingTableText, markdownTable);
    } else {
      onInsertTable(markdownTable);
    }
    onClose();
  };

  const handleReset = () => {
    initializeTable(3, 3);
    setRows(3);
    setColumns(3);
  };

  const markdownPreview = generateMarkdownTable();

  return (
    <DialogModal isOpened={isOpen} onClose={onClose} styles="max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <FaTable className="w-6 h-6 text-amber-600" />
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Create or Edit Table
          </h2>
        </div>

        <p className="text-neutral-600 dark:text-neutral-300">
          Add rows/columns, change content, and preview the markdown table.
          All changes will update your markdown document instantly.
        </p>

        {/* Existing Tables Section */}
        {currentContent && !isEditingExisting && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Existing Tables:</h3>
            {(() => {
              const existingTables = detectExistingTables(currentContent);
              if (existingTables.length === 0) {
                return (
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    No existing tables found in your document.
                  </p>
                );
              }
              return (
                <div className="space-y-2">
                  {existingTables.map((tableText, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                      <div className="flex-1">
                        <pre className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap font-mono max-h-20 overflow-y-auto">
                          {tableText}
                        </pre>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const parsedTable = parseMarkdownTable(tableText);
                          if (parsedTable.length > 0) {
                            setTable(parsedTable);
                            setRows(parsedTable.length);
                            setColumns(parsedTable[0]?.cells.length || 3);
                            setIsEditingExisting(true);
                            setExistingTableText(tableText);
                          }
                        }}
                        label="Edit This Table"
                        styles="ml-3"
                      />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Table Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Rows:
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={(e) => {
                const newRows = parseInt(e.target.value) || 1;
                setRows(newRows);
                if (newRows > table.length) {
                  // Add rows
                  const newTable = [...table];
                  for (let i = table.length; i < newRows; i++) {
                    newTable.push({
                      cells: Array(columns).fill(null).map(() => ({ content: "" }))
                    });
                  }
                  setTable(newTable);
                } else if (newRows < table.length) {
                  // Remove rows
                  setTable(table.slice(0, newRows));
                }
              }}
              className="w-16 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Columns:
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={columns}
              onChange={(e) => {
                const newCols = parseInt(e.target.value) || 1;
                setColumns(newCols);
                const newTable = table.map(row => {
                  const newCells = [...row.cells];
                  if (newCols > row.cells.length) {
                    // Add columns
                    for (let i = row.cells.length; i < newCols; i++) {
                      newCells.push({ content: "" });
                    }
                  } else if (newCols < row.cells.length) {
                    // Remove columns
                    newCells.splice(newCols);
                  }
                  return { ...row, cells: newCells };
                });
                setTable(newTable);
              }}
              className="w-16 px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={addRow}
              label={<><FaPlus className="w-4 h-4" />Add Row</>}
            />
            <Button
              variant="secondary"
              onClick={addColumn}
              label={<><FaPlus className="w-4 h-4" />Add Column</>}
            />
          </div>
        </div>

        {/* Table Editor */}
        <div className="border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-neutral-100 dark:bg-neutral-700">
                <tr>
                  {Array.from({ length: columns }, (_, colIndex) => (
                    <th key={colIndex} className="border border-neutral-300 dark:border-neutral-600 p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          Col {colIndex + 1}
                        </span>
                        {columns > 1 && (
                          <Button
                            variant="icon"
                            onClick={() => removeColumn(colIndex)}
                            aria-label="Remove column"
                            title="Remove column"
                            styles="w-6 h-6"
                          >
                            <FaTrash className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="border border-neutral-300 dark:border-neutral-600 p-2 w-12">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                    {row.cells.map((cell, colIndex) => (
                      <td key={colIndex} className="border border-neutral-300 dark:border-neutral-600 p-1">
                        <input
                          type="text"
                          value={cell.content}
                          onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                          placeholder={`Cell ${rowIndex + 1}-${colIndex + 1}`}
                          className="w-full px-2 py-1 border-none bg-transparent text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
                        />
                      </td>
                    ))}
                    <td className="border border-neutral-300 dark:border-neutral-600 p-1">
                      {table.length > 1 && (
                        <Button
                          variant="icon"
                          onClick={() => removeRow(rowIndex)}
                          aria-label="Remove row"
                          title="Remove row"
                          styles="w-6 h-6"
                        >
                          <FaTrash className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>



        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-neutral-300 dark:border-neutral-600">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleReset}
              label="Reset Table"
            />
            {isEditingExisting && (
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditingExisting(false);
                  setExistingTableText("");
                  initializeTable(3, 3);
                  setRows(3);
                  setColumns(3);
                }}
                label="Create New Table"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              label="Cancel"
            />
            <Button
              variant="primary"
              onClick={handleInsert}
              label={isEditingExisting ? "Update Table" : "Insert Table"}
            />
          </div>
        </div>
      </div>
    </DialogModal>
  );
};

export default TableEditorModal; 
