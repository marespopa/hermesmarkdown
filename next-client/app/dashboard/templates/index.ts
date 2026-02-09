import SimpleNotesTemplate from "./files/simple-notes";
import SystemPersonaTemplate from "./files/system-persona";
import FewShotTemplate from "./files/few-shot-examples";
import ChainOfThoughtTemplate from "./files/chain-of-thought";
import { FrontMatterGeneric } from "@/app/types/markdown";

export type MarkdownTemplate = {
  filename: string;
  frontMatter: FrontMatterGeneric;
  content: string;
};

const MarkdownTemplateList = [
  SystemPersonaTemplate,
  FewShotTemplate,
  ChainOfThoughtTemplate,
  SimpleNotesTemplate,
];

export default MarkdownTemplateList;
