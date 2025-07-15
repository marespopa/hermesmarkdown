import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();

const GymWorkoutTemplate: MarkdownTemplate = {
  filename: "gym-workout",
  frontMatter: {
    title: "Gym Workout",
    description: `A simple template for planning and tracking gym workouts with exercises, sets, reps, and rest periods.`,
    tags: "gym,workout,fitness,exercise,training,muscle",
  },
  content: `# 💪 Gym Workout
Workout Name: Push Day
Focus Area: Chest
Duration: 60 minutes
Created: ${date}

---

## 🎯 Main Workout

| Exercise Group | Exercise Name     | Sets | Reps | Rest (s) | Weight (lbs) |
|---------------|-------------------|------|------|----------|--------------|
| Primary       | Bench Press       | 3    | 10   | 90       | 135          |
| Primary       | Incline Dumbbell  | 3    | 10   | 90       | 40           |
| Primary       | Chest Fly         | 3    | 12   | 60       | 25           |
| Secondary     | Triceps Pushdown  | 3    | 12   | 60       | 50           |
| Secondary     | Overhead Extension| 3    | 10   | 60       | 30           |

---

## 📝 Workout Tracking

| Set | Exercise Name     | Weight (lbs) | Reps | Notes         |
|-----|-------------------|--------------|------|--------------|
| 1   | Bench Press       | 135          | 10   | Felt strong  |
| 1   | Incline Dumbbell  | 40           | 10   |              |
| 1   | Chest Fly         | 25           | 12   |              |
| 2   | Bench Press       | 135          | 10   |              |
| 2   | Incline Dumbbell  | 40           | 10   |              |
| 2   | Chest Fly         | 25           | 12   |              |
| 3   | Bench Press       | 135          | 10   |              |
| 3   | Incline Dumbbell  | 40           | 10   |              |
| 3   | Chest Fly         | 25           | 12   |              |

---

## 📊 Progress Notes

| Date       | Overall Performance | Next Workout     |
|------------|--------------------|------------------|
| ${date}    | Good               | Pull Day         |
`,
};

export default GymWorkoutTemplate; 