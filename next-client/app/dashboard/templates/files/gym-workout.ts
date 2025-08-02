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
**Date:** ${date}
**Focus Area:** 

---

## 🎯 Main Workout

### Primary Exercises
- Bench Press - 3x8 - 185lbs
- 
- 


### Secondary Exercises
- 
- 

---

## 📊 Notes

`,
};

export default GymWorkoutTemplate; 