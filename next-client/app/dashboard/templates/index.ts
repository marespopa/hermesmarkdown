import { FrontMatterGeneric } from "@/app/types/markdown";
import ToDoListTemplate from "./files/todo-list-template";
import DashboardTemplate from "./files/dashboard";
import WeeklyJournalTemplate from "./files/weekly-journal";
import ProjectManagementTemplate from "./files/project-management-template";
import SoftwareTaskTemplate from "./files/software-task-template";
import SASSTemplate from "./files/sass-template";
import DailyStandupTemplate from "./files/daily-standup";
import MeetingNotesTemplate from "./files/meeting-notes";
import MonthlyBudgetTemplate from "./files/monthly-budget";
import HabitTrackerTemplate from "./files/habit";
import BugReportTemplate from "./files/bug-report";
import CodeReviewTemplate from "./files/code-review";
import SprintRetrospectiveTemplate from "./files/sprint-retrospective";
import ProductRequirementsTemplate from "./files/product-requirements";
import UserStoryTemplate from "./files/user-story";
import TechnicalDocumentationTemplate from "./files/technical-documentation";
import InterviewNotesTemplate from "./files/interview-notes";
import LearningNotesTemplate from "./files/learning-notes";
import TravelPlanningTemplate from "./files/travel-planning";
import RecipeTemplate from "./files/recipe";
import GymWorkoutTemplate from "./files/gym-workout";
import LifeDashboardTemplate from "./files/life-dashboard";
import BookTrackerTemplate from "./files/book-tracker";
import FreelancerTemplate from "./files/freelancer";
import TeacherPlannerTemplate from "./files/teacher-planner";

export type MarkdownTemplate = {
  filename: string;
  frontMatter: FrontMatterGeneric;
  content: string;
};

const MarkdownTemplateList = [
  // High-demand dashboards that combine multiple life/work areas
  LifeDashboardTemplate,
  
  // Extremely popular trackers
  HabitTrackerTemplate,
  BookTrackerTemplate,
  MonthlyBudgetTemplate,
  GymWorkoutTemplate,
  
  // Core project/task management and knowledge management
  DashboardTemplate,
  ProjectManagementTemplate,
  ToDoListTemplate,
  SoftwareTaskTemplate,
  
  // Highly sought after professional templates
  FreelancerTemplate,
  TeacherPlannerTemplate,
  
  // Additional useful templates
  DailyStandupTemplate,
  MeetingNotesTemplate,
  WeeklyJournalTemplate,
  SASSTemplate,
  BugReportTemplate,
  CodeReviewTemplate,
  SprintRetrospectiveTemplate,
  ProductRequirementsTemplate,
  UserStoryTemplate,
  TechnicalDocumentationTemplate,
  InterviewNotesTemplate,
  LearningNotesTemplate,
  TravelPlanningTemplate,
  RecipeTemplate,
];

export default MarkdownTemplateList;
