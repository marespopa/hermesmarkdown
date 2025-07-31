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
Workout Name:
Focus Area: 
Duration: 
Created: ${date}

---

## 🎯 Main Workout

| Exercise Group     | Exercise Name     | Sets | Reps | Rest (s) | Weight (lbs) |
|--------------------|-------------------|------|------|----------|--------------|
| Primary            |                   |      |      |          |              |
| Primary            |                   |      |      |          |              |
| Primary            |                   |      |      |          |              |
| Secondary          |                   |      |      |          |              |
| Secondary          |                   |      |      |          |              |
---

## 📊 Progress Notes

| Date       | Overall Performance | Next Workout |
|------------|---------------------|--------------|
| ${date}    | Good                | Pull Day     |
`,
};

export default GymWorkoutTemplate; 