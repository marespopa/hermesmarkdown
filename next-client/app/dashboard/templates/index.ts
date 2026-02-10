// Imports - Category: General
import GenericTaskTemplate from "./files/generic-task";
import TaskPromptGeneratorTemplate from "./files/task-prompt-generator";

// Imports - Category: Architect & Design
import SystemContractTemplate from "./files/system-contract";
import ComponentRefactorTemplate from "./files/component-refactor";
import DatabaseSchemaTemplate from "./files/database-schema";

// Imports - Category: Testing & Security
import SecurityRedTeamTemplate from "./files/security-red-team";
import UnitTestSuiteTemplate from "./files/unit-test-suite";

// Imports - Category: Analysis & Logic
import BalancedDecisionTemplate from "./files/balanced-decision";
import StepByStepReasoningTemplate from "./files/step-by-step-reasoning";
import StructuralCritiqueTemplate from "./files/structural-critique";
import LegacyModernizationTemplate from "./files/legacy-modernization";

// Imports - Category: Communication
import PrDescriptionTemplate from "./files/pr-description";
import ReleaseNotesTemplate from "./files/release-notes";
import PostMortemTemplate from "./files/post-mortem";
import IncidentUpdateTemplate from "./files/incident-update";
import StakeholderBriefTemplate from "./files/stakeholder-brief";
import StatusUpdateTemplate from "./files/status-update";
import MeetingSummaryTemplate from "./files/meeting-summary";
import DecisionRecordTemplate from "./files/decision-record";
import RoadmapBriefTemplate from "./files/roadmap-brief";
import CustomerUpdateTemplate from "./files/customer-update";
import { FrontMatterGeneric } from "@/app/types/markdown";

export type MarkdownTemplate = {
  filename: string;
  frontMatter: FrontMatterGeneric;
  content: string;
};

const MarkdownTemplateList = [
  // General
  GenericTaskTemplate,
  TaskPromptGeneratorTemplate,
  // Architect
  SystemContractTemplate,
  ComponentRefactorTemplate,
  DatabaseSchemaTemplate,
  // Testing
  SecurityRedTeamTemplate,
  UnitTestSuiteTemplate,
  // Analysis
  BalancedDecisionTemplate,
  StepByStepReasoningTemplate,
  StructuralCritiqueTemplate,
  LegacyModernizationTemplate,
  // Communication
  PrDescriptionTemplate,
  ReleaseNotesTemplate,
  PostMortemTemplate,
  IncidentUpdateTemplate,
  StakeholderBriefTemplate,
  StatusUpdateTemplate,
  MeetingSummaryTemplate,
  DecisionRecordTemplate,
  RoadmapBriefTemplate,
  CustomerUpdateTemplate,
  // ... continue adding to 50
];

export default MarkdownTemplateList;
