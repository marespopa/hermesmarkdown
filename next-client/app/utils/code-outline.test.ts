// @vitest-environment node
import { describe, expect, it } from "vitest";
import { Text } from "@codemirror/state";
import type { LRParser } from "@lezer/lr";
import { parser as js } from "@lezer/javascript";
import { parser as python } from "@lezer/python";
import { parser as rust } from "@lezer/rust";
import { parser as go } from "@lezer/go";
import { parser as cpp } from "@lezer/cpp";
import { parser as css } from "@lezer/css";
import { parser as json } from "@lezer/json";
import { parser as yaml } from "@lezer/yaml";
import { extractCodeOutline } from "./code-outline";

const kinds = (parser: LRParser, source: string) =>
  extractCodeOutline(parser.parse(source), Text.of(source.split("\n"))).map(({ text, kind }) => `${text}:${kind}`);

const outline = (parser: LRParser, source: string) =>
  extractCodeOutline(parser.parse(source), Text.of(source.split("\n"))).map(({ level, text, line }) => `${level} ${text} @${line}`);

describe("extractCodeOutline", () => {
  it("lists TypeScript functions, classes with their methods, types and top-level declarations", () => {
    const source = [
      "import { x } from 'y';",
      "export interface Order { id: string }",
      "type Id = string;",
      "export class Store extends Base {",
      "  load() {}",
      "  #save() {}",
      "}",
      "export function total(items: Order[]) { const inner = () => 1; return 0; }",
      "export const OrderList = () => null;",
      "const limit = 5;",
    ].join("\n");
    expect(outline(js.configure({ dialect: "ts" }), source)).toEqual([
      "1 Order @2", "1 Id @3", "1 Store @4", "2 load @5", "2 #save @6", "1 total @8", "1 OrderList @9", "1 limit @10",
    ]);
  });

  it("lists Python classes, methods and functions", () => {
    const source = "class Report:\n    def render(self):\n        pass\n\ndef main():\n    pass\n";
    expect(outline(python, source)).toEqual(["1 Report @1", "2 render @2", "1 main @5"]);
  });

  it("names a Rust impl by its header and a C++ function by its name, not its return type", () => {
    expect(outline(rust, "struct Point { x: i32 }\nimpl Display for Point {\n    fn fmt(&self) {}\n}\n"))
      .toEqual(["1 Point @1", "1 impl Display for Point @2", "2 fmt @3"]);
    expect(outline(cpp, "struct Point { int x; };\nPoint make() { return {}; }\nstruct Point p;\n"))
      .toEqual(["1 Point @1", "2 x @1", "1 make @2"]);
  });

  it("lists Go functions, methods and types", () => {
    expect(outline(go, "package main\n\ntype Server struct{}\n\nfunc (s *Server) Start() {}\n\nfunc main() {}\n"))
      .toEqual(["1 Server @3", "1 Start @5", "1 main @7"]);
  });

  it("lists CSS selectors and JSON / YAML keys two levels deep", () => {
    expect(outline(css, ".card, .panel { color: red }\n@media (min-width: 1px) {\n  a:hover { color: blue }\n}\n"))
      .toEqual(["1 .card, .panel @1", "1 a:hover @3"]);
    expect(outline(json, '{\n  "name": "app",\n  "scripts": {\n    "dev": { "deep": 1 }\n  }\n}'))
      .toEqual(["1 name @2", "1 scripts @3", "2 dev @4"]);
    expect(outline(yaml, "services:\n  web:\n    image: nginx\nversion: 3\n"))
      .toEqual(["1 services @1", "2 web @2", "1 version @4"]);
  });

  it("lists no object-literal members in TypeScript, nor names from their values", () => {
    const source = [
      "export function reply(result: { text: string; response: { messages: unknown[] } }) {",
      "  return json({",
      "    text: result.text,",
      "    ...(ok ? { calls, responseMessages: result.response.messages } : {}),",
      "  }, { status: res.status });",
      "}",
    ].join("\n");
    expect(outline(js.configure({ dialect: "ts" }), source)).toEqual(["1 reply @1"]);
  });

  it("names no symbol from a parameter or a value", () => {
    expect(outline(js.configure({ dialect: "ts" }), "export default function (p) {}\nexport const a = x.y;\n"))
      .toEqual(["1 a @2"]);
    expect(outline(python, "MAX = config.LIMIT\n")).toEqual(["1 MAX @1"]);
  });

  it("gives each TypeScript symbol its kind: fields, enum members, constants, variables", () => {
    const source = [
      "class Store { private items = []; static limit: number; get size() { return 0 } }",
      "enum Status { Draft, Done = 2 }",
      "export const MAX = 5;",
      "let count = 0, total;",
      "const Panel = class {};",
      "describe('store', () => { const inner = 1; });",
      "namespace Api { const hidden = 1; }",
    ].join("\n");
    expect(kinds(js.configure({ dialect: "ts" }), source)).toEqual([
      "Store:class", "items:field", "limit:field", "size:method",
      "Status:enum", "Draft:member", "Done:member",
      "MAX:constant", "count:variable", "total:variable", "Panel:class", "Api:module",
    ]);
  });

  it("lists Python module constants, not other globals, and methods under their class", () => {
    const source = "MAX_SIZE = 10\nname = 'x'\n\n@cached\ndef load():\n    LOCAL = 1\n\nclass Report:\n    TITLE = 'r'\n    def render(self):\n        pass\n";
    expect(kinds(python, source)).toEqual(["MAX_SIZE:constant", "load:function", "Report:class", "render:method"]);
  });

  it("lists Rust constants, statics, enum variants, struct fields and trait methods", () => {
    const source = [
      "const MAX: u32 = 1;",
      "static NAME: &str = \"a\";",
      "enum Shape { Circle(f64), Square { side: f64 } }",
      "struct Point { pub x: i32 }",
      "trait Draw { fn draw(&self); }",
      "macro_rules! log { () => {} }",
    ].join("\n");
    expect(kinds(rust, source)).toEqual([
      "MAX:constant", "NAME:constant", "Shape:enum", "Circle:member", "Square:member", "side:field",
      "Point:struct", "x:field", "Draw:interface", "draw:method", "log:function",
    ]);
  });
});
