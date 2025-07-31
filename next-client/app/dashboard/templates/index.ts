import LifeDashboardTemplate from "./files/life-dashboard";
import HabitTrackerTemplate from "./files/habit";
import BookTrackerTemplate from "./files/book-tracker";
import MonthlyBudgetTemplate from "./files/monthly-budget";
import GymWorkoutTemplate from "./files/gym-workout";
import DashboardTemplate from "./files/dashboard";
import ProjectManagementTemplate from "./files/project-management-template";
import ToDoListTemplate from "./files/todo-list-template";
import MeetingNotesTemplate from "./files/meeting-notes";
import SoftwareTaskTemplate from "./files/software-task-template";
import CodeSnippetTemplate from "./files/code-snippet";
import { FrontMatterGeneric } from "@/app/types/markdown";

export type MarkdownTemplate = {
  filename: string;
  frontMatter: FrontMatterGeneric;
  content: string;
};

const MarkdownTemplateList = [
  LifeDashboardTemplate,
  HabitTrackerTemplate,
  BookTrackerTemplate,
  MonthlyBudgetTemplate,
  GymWorkoutTemplate,
  DashboardTemplate,
  ProjectManagementTemplate,
  ToDoListTemplate,
  MeetingNotesTemplate,
  SoftwareTaskTemplate,
  CodeSnippetTemplate,
];

export default MarkdownTemplateList;
