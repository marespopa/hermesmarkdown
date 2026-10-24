// A code file's outline from its syntax tree: modules, types, functions and
// methods, fields, constants and enum members (JavaScript / TypeScript,
// Python, Rust, Go, Java, C / C++, PHP), CSS / SCSS rule selectors, and
// JSON / YAML keys two levels deep, each with its kind (the row's icon).
// Nesting gives the level (a method under its class), up to 3. Languages
// without a real syntax tree (legacy modes such as shell) have no outline;
// C# has its own line scan (csharp-outline.ts).
import type { SyntaxNode, SyntaxNodeRef, Tree } from "@lezer/common";
import type { Text } from "@codemirror/state";
import type { OutlineHeading, SymbolKind } from "./markdown-outline";

interface Rule {
  kind: SymbolKind | ((node: SyntaxNode) => SymbolKind);
  /** Node names that hold the symbol's name (findName). */
  names?: string[];
  /** Every direct child named in `names` is a symbol (`let a = 1, b`). */
  many?: boolean;
  /** The label from the node itself instead (a CSS selector). */
  label?: (node: SyntaxNode, doc: Text) => string | null;
  /** Only counts when this holds (a top-level `const`). */
  when?: (node: SyntaxNode, nested: boolean, doc: Text) => boolean;
  /** Deepest level listed for this kind (keys stop at 2). */
  maxLevel?: number;
}

const DEF_NAMES = [
  "VariableDefinition", "TypeDefinition", "PropertyDefinition", "PrivatePropertyDefinition", "VariableName",
  "Definition", "DefName", "FieldName", "BoundIdentifier", "TypeIdentifier", "Name", "Identifier", "FieldIdentifier",
];
const def = (kind: SymbolKind): Rule => ({ kind, names: DEF_NAMES });
// No type names: a C++ function's return type (`Point make()`) comes first.
const functionDef: Rule = { kind: "function", names: ["VariableName", "Name", "Identifier", "FieldIdentifier", "VariableDefinition", "Definition"] };
const FUNCTION_VALUES = new Set(["ArrowFunction", "FunctionExpression"]);
// A function directly inside one of these is a method.
const METHOD_HOSTS = new Set<SymbolKind>(["class", "struct", "interface", "module"]);
const MAX_ITEMS = 1000;
const MAX_LABEL = 60;

// A type with a body, not a use of one (`struct Point p;`).
const hasBody = (node: SyntaxNode) => {
  for (let child = node.firstChild; child; child = child.nextSibling) if (/List$|Block$/.test(child.name)) return true;
  return false;
};

// At the file's top level (also under `export`), not in a block or callback.
const isTopLevel = (node: SyntaxNode) => {
  const parent = node.parent?.name === "ExportDeclaration" ? node.parent.parent : node.parent;
  return !parent?.parent;
};

const selector: Rule = {
  kind: "selector",
  label: (node, doc) => {
    const block = node.getChild("Block");
    return doc.sliceString(node.from, block ? block.from : node.to).replace(/\s+/g, " ").trim() || null;
  },
};

// The header up to the body: `impl Display for Point`.
const header: Rule = {
  kind: "module",
  label: (node, doc) => {
    const block = node.getChild("DeclarationList") ?? node.getChild("Block");
    return doc.sliceString(node.from, block ? block.from : node.to).replace(/\s+/g, " ").trim() || null;
  },
};

const key = (names: string[]): Rule => ({ kind: "key", names, maxLevel: 2 });

// `const f = () => …` is a function, `const Store = class {}` a class, any
// other `const` a constant, `let` / `var` a variable.
const variableKind = (node: SyntaxNode): SymbolKind => {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (FUNCTION_VALUES.has(child.name)) return "function";
    if (child.name === "ClassExpression") return "class";
  }
  return node.firstChild?.name === "const" ? "constant" : "variable";
};

// `export default <value>`: the export itself is the symbol, named after
// what it exports (`export default tseslint.config`, `export default
// config`), so a config file without declarations still has an outline. A
// named function or class (`export default function f`) lists itself.
const defaultValue = (node: SyntaxNode) => node.getChild("default")?.nextSibling ?? null;
const exportDefault: Rule = {
  kind: (node) => {
    const value = defaultValue(node)?.name ?? "";
    return FUNCTION_VALUES.has(value) || value === "FunctionDeclaration" ? "function" : value === "ClassDeclaration" ? "class" : "constant";
  },
  when: (node) => {
    const value = defaultValue(node);
    return !!value && !(/^(Function|Class)Declaration$/.test(value.name) && value.getChild("VariableDefinition"));
  },
  label: (node, doc) => {
    const value = defaultValue(node)!;
    const head = value.name === "CallExpression" ? value.firstChild : value.name === "VariableName" || value.name === "MemberExpression" ? value : null;
    return head ? `export default ${doc.sliceString(head.from, head.to)}` : "export default";
  },
};

const RULES: Record<string, Rule> = {
  // JavaScript / TypeScript
  ExportDeclaration: exportDefault,
  FunctionDeclaration: def("function"),
  ClassDeclaration: def("class"),
  MethodDeclaration: def("method"),
  PropertyDeclaration: { kind: "field", names: ["PropertyDefinition", "PrivatePropertyDefinition"] },
  InterfaceDeclaration: def("interface"),
  TypeAliasDeclaration: def("type"),
  EnumDeclaration: def("enum"),
  NamespaceDeclaration: def("module"),
  VariableDeclaration: {
    kind: variableKind,
    names: ["VariableDefinition"],
    many: true,
    when: (node, nested) => !nested && isTopLevel(node),
  },
  // A TypeScript enum's members (`enum E { One, Two }`).
  PropertyName: { kind: "member", label: (node, doc) => doc.sliceString(node.from, node.to), when: (node) => node.parent?.name === "EnumBody" },
  // Python, C / C++, PHP
  FunctionDefinition: functionDef,
  ClassDefinition: def("class"),
  // A module-level Python constant (`MAX_SIZE = 10`).
  AssignStatement: {
    kind: "constant",
    names: ["VariableName"],
    when: (node, nested, doc) => {
      const name = node.firstChild;
      return !nested && isTopLevel(node) && !!name && /^[A-Z][A-Z0-9_]*$/.test(doc.sliceString(name.from, name.to));
    },
  },
  ClassSpecifier: { ...def("class"), when: hasBody },
  StructSpecifier: { ...def("struct"), when: hasBody },
  EnumSpecifier: { ...def("enum"), when: hasBody },
  UnionSpecifier: { ...def("struct"), when: hasBody },
  NamespaceDefinition: def("module"),
  TraitDeclaration: def("interface"),
  // Rust, C / C++ and Java fields (not a C++ method's declaration).
  FieldDeclaration: { kind: "field", names: ["FieldIdentifier", "Definition"], when: (node) => !node.getChild("FunctionDeclarator") },
  // Rust
  FunctionItem: def("function"),
  StructItem: def("struct"),
  EnumItem: def("enum"),
  EnumVariant: { kind: "member", names: ["Identifier"] },
  UnionItem: def("struct"),
  TraitItem: def("interface"),
  TypeItem: def("type"),
  ConstItem: def("constant"),
  StaticItem: def("constant"),
  ModItem: def("module"),
  MacroDefinition: def("function"),
  ImplItem: header,
  // Go
  FunctionDecl: def("function"),
  MethodDecl: def("method"),
  TypeSpec: def("type"),
  // Java
  ConstructorDeclaration: def("method"),
  // CSS / SCSS
  RuleSet: selector,
  // JSON / YAML
  Property: key(["PropertyName"]),
  Pair: key(["Key"]),
};

// Starts a declaration's value or type: no name follows (`a: x.b`, `= x.b`).
const VALUE_START = new Set(["=", ":", "Equals", "AssignOp"]);

// The first node named in `names` before the declaration's value, nearest
// first: a direct child, or one inside a declarator (C++ `f()`, Java
// `x = 1`). Never from a value, parameter list or body (`a: x.b` is no `b`).
function findName(node: SyntaxNode, names: string[]): SyntaxNode | null {
  const wanted = new Set(names);
  const declarators: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (VALUE_START.has(child.name)) break;
    if (wanted.has(child.name)) return child;
    if (child.name.endsWith("Declarator")) declarators.push(child);
  }
  for (const parent of declarators) {
    for (let child = parent.firstChild; child; child = child.nextSibling) {
      if (VALUE_START.has(child.name)) break;
      if (wanted.has(child.name)) return child;
    }
  }
  return null;
}

// Every direct child named in `names`.
function findNames(node: SyntaxNode, names: string[]): SyntaxNode[] {
  const found: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) if (names.includes(child.name)) found.push(child);
  return found;
}

const clip = (text: string) => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text);

export function extractCodeOutline(tree: Tree, doc: Text): OutlineHeading[] {
  const items: OutlineHeading[] = [];
  // The symbols the walk is inside, by node (to pop on leave).
  const open: { from: number; to: number; name: string; kind: SymbolKind }[] = [];
  const isOpen = (node: SyntaxNodeRef) => {
    const top = open[open.length - 1];
    return !!top && top.from === node.from && top.to === node.to && top.name === node.name;
  };

  tree.iterate({
    enter: (ref) => {
      if (items.length >= MAX_ITEMS) return false;
      const rule = RULES[ref.name];
      if (!rule) return;
      const node = ref.node;
      const level = open.length + 1;
      if (level > Math.min(rule.maxLevel ?? 3, 3)) return false;
      if (rule.when && !rule.when(node, open.length > 0, doc)) return;
      let kind = typeof rule.kind === "function" ? rule.kind(node) : rule.kind;
      if (kind === "function" && METHOD_HOSTS.has(open[open.length - 1]?.kind)) kind = "method";
      const found: { text: string; line: number }[] = [];
      if (rule.label) {
        const text = rule.label(node, doc);
        if (text) found.push({ text, line: doc.lineAt(node.from).number });
      } else {
        const names = rule.many ? findNames(node, rule.names!) : [findName(node, rule.names!)];
        for (const name of names) {
          if (!name) continue;
          const text = doc.sliceString(name.from, name.to).replace(/^["']|["']$/g, "");
          if (text) found.push({ text, line: doc.lineAt(name.from).number });
        }
      }
      if (!found.length) return;
      for (const { text, line } of found) items.push({ level: level as 1 | 2 | 3, text: clip(text), line, kind });
      open.push({ from: node.from, to: node.to, name: node.name, kind });
    },
    leave: (ref) => {
      if (isOpen(ref)) open.pop();
    },
  });
  return items;
}
