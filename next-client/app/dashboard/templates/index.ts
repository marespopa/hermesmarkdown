import MonthlyBudgetTemplate from "./files/monthly-budget";
import GymWorkoutTemplate from "./files/gym-workout";
import DashboardTemplate from "./files/dashboard";
import ToDoListTemplate from "./files/todo-list-template";
import MeetingNotesTemplate from "./files/meeting-notes";
import TabularDataTemplate from "./files/tabular-data";
import SimpleNotesTemplate from "./files/simple-notes";
import { FrontMatterGeneric } from "@/app/types/markdown";

export type MarkdownTemplate = {
  filename: string;
  frontMatter: FrontMatterGeneric;
  content: string;
};

const MarkdownTemplateList = [
  SimpleNotesTemplate,
  ToDoListTemplate,
  DashboardTemplate,
  TabularDataTemplate,
  MeetingNotesTemplate,
  MonthlyBudgetTemplate,
  GymWorkoutTemplate,
];

export default MarkdownTemplateList;
