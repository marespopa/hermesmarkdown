export type TaskState = "todo" | "in_progress" | "done" | "canceled" | "none";

export interface TaskMetadata {
  due?: string;
  scheduled?: string;
  remind?: string;
  priority?: "high" | "med" | "low";
  context?: string[];
  tags?: string[];
}

export interface OutlineNode {
  id: string;
  filePath: string;
  lineNumber: number;
  indentationLevel: number;
  rawContent: string;
  textContent: string;
  isTask: boolean;
  taskState: TaskState;
  metadata: TaskMetadata;
  parentHeading?: string;
  childIds: string[];
  parentId?: string;
  range: {
    from: number;
    to: number;
  };
}

export interface ParsedDocument {
  filePath: string;
  mtime: number;
  nodes: OutlineNode[];
  rootIds: string[];
  tasks: OutlineNode[];
}

const HEADING_PATTERN = /^( {0,3})(#{1,6})\s+(.*?)\s*#*\s*$/;
const LIST_PATTERN = /^(\s*)(?:[-*+]\s+|\d+[.)]\s+)(.*)$/;
const TASK_PATTERN = /^\[([ xX/\-])\]\s*(.*)$/;
const DIRECTIVE_PATTERN = /@([a-z]+)\(([^)]*)\)/gi;
const TAG_PATTERN = /(^|\s)#([\w-]+)/g;

function hash(value: string): string {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return (result >>> 0).toString(36);
}

function indentationLevel(whitespace: string): number {
  let columns = 0;
  for (const character of whitespace) columns += character === "\t" ? 4 : 1;
  return columns;
}

function parseMetadata(value: string): TaskMetadata {
  const metadata: TaskMetadata = {};
  const contexts: string[] = [];
  const tags: string[] = [];

  for (const match of value.matchAll(DIRECTIVE_PATTERN)) {
    const key = match[1].toLowerCase();
    const directiveValue = match[2].trim();
    if (!directiveValue) continue;
    if (key === "due" || key === "scheduled" || key === "remind") {
      metadata[key] = directiveValue;
    } else if (key === "priority" && ["high", "med", "low"].includes(directiveValue)) {
      metadata.priority = directiveValue as TaskMetadata["priority"];
    } else if (key === "context") {
      contexts.push(directiveValue);
    }
  }

  for (const match of value.matchAll(TAG_PATTERN)) tags.push(match[2]);
  if (contexts.length) metadata.context = contexts;
  if (tags.length) metadata.tags = tags;
  return metadata;
}

function taskState(value: string): TaskState {
  const match = value.match(TASK_PATTERN);
  if (!match) return "none";
  if (match[1].toLowerCase() === "x") return "done";
  if (match[1] === "/") return "in_progress";
  if (match[1] === "-") return "canceled";
  return "todo";
}

function displayText(value: string, isTask: boolean): string {
  const withoutTaskMarker = isTask ? value.replace(TASK_PATTERN, "$2") : value;
  return withoutTaskMarker
    .replace(DIRECTIVE_PATTERN, "")
    .replace(/(^|\s)#(?:todo|prog|hold|done)\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseOutline(
  filePath: string,
  content: string,
  mtime = 0,
): ParsedDocument {
  const lines = content.split("\n");
  const nodes: OutlineNode[] = [];
  const headingStack: OutlineNode[] = [];
  const listStack: OutlineNode[] = [];
  let offset = 0;

  lines.forEach((line, lineNumber) => {
    const heading = line.match(HEADING_PATTERN);
    const list = line.match(LIST_PATTERN);
    if (!heading && !list) {
      offset += line.length + 1;
      return;
    }

    const isHeading = Boolean(heading);
    const whitespace = (heading ?? list)?.[1] ?? "";
    const sourceValue = isHeading ? heading?.[3] ?? "" : list?.[2] ?? "";
    const state = isHeading ? "none" : taskState(sourceValue);
    const isTask = state !== "none";
    const metadata = parseMetadata(sourceValue);
    const id = `${filePath}#${lineNumber}-${hash(line)}`;
    const node: OutlineNode = {
      id,
      filePath,
      lineNumber,
      indentationLevel: isHeading ? Number(heading?.[2].length ?? 1) - 1 : indentationLevel(whitespace),
      rawContent: line,
      textContent: displayText(sourceValue, isTask),
      isTask,
      taskState: state,
      metadata,
      parentHeading: headingStack.at(-1)?.textContent,
      childIds: [],
      range: { from: offset, to: offset + line.length },
    };

    if (isHeading) {
      const level = node.indentationLevel;
      while (headingStack.length && headingStack.at(-1)!.indentationLevel >= level) headingStack.pop();
      if (headingStack.length) node.parentId = headingStack.at(-1)!.id;
      headingStack.push(node);
      listStack.length = 0;
    } else {
      while (listStack.length && listStack.at(-1)!.indentationLevel >= node.indentationLevel) listStack.pop();
      node.parentId = listStack.at(-1)?.id ?? headingStack.at(-1)?.id;
      listStack.push(node);
    }

    nodes.push(node);
    if (node.parentId) {
      nodes.find((candidate) => candidate.id === node.parentId)?.childIds.push(node.id);
    }
    offset += line.length + 1;
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  return {
    filePath,
    mtime,
    nodes,
    rootIds: nodes.filter((node) => !node.parentId || !nodeIds.has(node.parentId)).map((node) => node.id),
    tasks: nodes.filter((node) => node.isTask),
  };
}