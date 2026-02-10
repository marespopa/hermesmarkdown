import SystemContractTemplate from "./files/system-contract";
import ComponentRefactorTemplate from "./files/component-refactor";
import StructuralCritiqueTemplate from "./files/structural-critique";
import BalancedDecisionTemplate from "./files/balanced-decision";
import StepByStepReasoningTemplate from "./files/step-by-step-reasoning";
import LegacyModernizationTemplate from "./files/legacy-modernization";
import { FrontMatterGeneric } from "@/app/types/markdown";

export type MarkdownTemplate = {
  filename: string;
  frontMatter: FrontMatterGeneric;
  content: string;
};

const MarkdownTemplateList = [
  SystemContractTemplate,
  ComponentRefactorTemplate,
  StructuralCritiqueTemplate,
  BalancedDecisionTemplate,
  StepByStepReasoningTemplate,
  LegacyModernizationTemplate,
];

export default MarkdownTemplateList;
