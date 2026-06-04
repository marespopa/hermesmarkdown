export interface DateMatch {
  date: Date;
  start: number;
  end: number;
  format: "iso" | "slashed" | "dotted" | "wiki";
  rawString: string;
}
