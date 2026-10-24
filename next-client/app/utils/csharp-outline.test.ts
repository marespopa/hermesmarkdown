// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blankCSharp, extractCSharpOutline } from "./csharp-outline";

const outline = (source: string) =>
  extractCSharpOutline(source).map(({ level, text, line, kind }) => `${level} ${text}:${kind} @${line}`);

describe("extractCSharpOutline", () => {
  it("lists a namespace's types and their members with kinds", () => {
    const source = [
      "using System;",
      "namespace Shop.Orders",
      "{",
      "    [Serializable]",
      "    public sealed class Order : IOrder",
      "    {",
      "        public const int MaxItems = 50;",
      "        private readonly Dictionary<string, int> _counts = new();",
      "        public event EventHandler Changed;",
      "        public Order() : base() { }",
      "        ~Order() { }",
      "        public string Name { get; set; } = \"\";",
      "        public int Total => _counts.Count;",
      "        public int this[int index] => index;",
      "        public async Task<(int, string)> LoadAsync<T>(int id) where T : new()",
      "        {",
      "            var local = 1;",
      "            if (local > 0) { Console.WriteLine(\"{ not a block\"); }",
      "        }",
      "        public static Order operator +(Order a, Order b) => a;",
      "    }",
      "    public interface IOrder { void Ship(); }",
      "    public record Line(string Product, int Quantity);",
      "    public delegate void Shipped(Order order);",
      "}",
    ].join("\n");
    expect(outline(source)).toEqual([
      "1 Shop.Orders:module @2",
      "2 Order:class @5",
      "3 MaxItems:constant @7",
      "3 _counts:field @8",
      "3 Changed:event @9",
      "3 Order:method @10",
      "3 ~Order:method @11",
      "3 Name:property @12",
      "3 Total:property @13",
      "3 this[]:property @14",
      "3 LoadAsync:method @15",
      "3 operator +:method @20",
      "2 IOrder:interface @22",
      "3 Ship:method @22",
      "2 Line:class @23",
      "2 Shipped:type @24",
    ]);
  });

  it("nests under a file-scoped namespace and lists enum values", () => {
    const source = [
      "namespace Shop;",
      "",
      "public enum Status",
      "{",
      "    Draft,",
      "    [Description(\"a, b\")] Shipped = 2,",
      "    Done",
      "}",
      "public readonly record struct Point(int X, int Y);",
    ].join("\n");
    expect(outline(source)).toEqual([
      "1 Shop:module @1",
      "2 Status:enum @3",
      "3 Draft:member @5",
      "3 Shipped:member @6",
      "3 Done:member @7",
      "2 Point:struct @9",
    ]);
  });

  it("ignores top-level statements, comments and strings", () => {
    const source = [
      "// class Hidden { }",
      "/* struct Gone",
      "   { } */",
      "Console.WriteLine(@\"class \"\"Quoted\"\" {\");",
      "var raw = \"\"\"",
      "    interface Raw { }",
      "    \"\"\";",
      "#region Types",
      "class Program { static void Main() { } }",
      "#endregion",
    ].join("\n");
    expect(outline(source)).toEqual(["1 Program:class @9", "2 Main:method @9"]);
  });

  it("keeps every line when blanking comments and strings", () => {
    const source = "a /* x\ny */ b \"s\\\"\" 'c' @\"v\n\" d";
    const blanked = blankCSharp(source);
    expect(blanked.split("\n")).toHaveLength(3);
    expect(blanked).not.toMatch(/[xysv]/);
  });
});
