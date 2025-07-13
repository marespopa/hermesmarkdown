import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const GymWorkoutTemplate: MarkdownTemplate = {
  filename: "gym-workout",
  frontMatter: {
    title: "Gym Workout",
    description: `A simple template for planning and tracking gym workouts with exercises, sets, reps, and rest periods.`,
    tags: "gym,workout,fitness,exercise,training,muscle",
  },
  content: `# 💪 Gym Workout

Workout Name: [WORKOUT_NAME]

Focus Area: [FOCUS_AREA]

Duration: [DURATION] minutes

Created: ${date}

---

## 🎯 Main Workout

### Exercise Group 1: [PRIMARY_MUSCLE_GROUP]

Exercise 1: [EXERCISE_1_NAME]
- Sets: [SETS] sets
- Reps: [REPS] reps
- Rest: [REST_TIME] seconds
- Weight: [WEIGHT] lbs

Exercise 2: [EXERCISE_2_NAME]
- Sets: [SETS] sets
- Reps: [REPS] reps
- Rest: [REST_TIME] seconds
- Weight: [WEIGHT] lbs

Exercise 3: [EXERCISE_3_NAME]
- Sets: [SETS] sets
- Reps: [REPS] reps
- Rest: [REST_TIME] seconds
- Weight: [WEIGHT] lbs

### Exercise Group 2: [SECONDARY_MUSCLE_GROUP]

Exercise 1: [EXERCISE_4_NAME]
- Sets: [SETS] sets
- Reps: [REPS] reps
- Rest: [REST_TIME] seconds
- Weight: [WEIGHT] lbs

Exercise 2: [EXERCISE_5_NAME]
- Sets: [SETS] sets
- Reps: [REPS] reps
- Rest: [REST_TIME] seconds
- Weight: [WEIGHT] lbs

---

## 📝 Workout Tracking

### Set 1
| Exercise | Weight | Reps | Notes |
|----------|--------|------|-------|
| [EXERCISE_1_NAME] | [WEIGHT] | [REPS] | [NOTES] |
| [EXERCISE_2_NAME] | [WEIGHT] | [REPS] | [NOTES] |
| [EXERCISE_3_NAME] | [WEIGHT] | [REPS] | [NOTES] |

### Set 2
| Exercise | Weight | Reps | Notes |
|----------|--------|------|-------|
| [EXERCISE_1_NAME] | [WEIGHT] | [REPS] | [NOTES] |
| [EXERCISE_2_NAME] | [WEIGHT] | [REPS] | [NOTES] |
| [EXERCISE_3_NAME] | [WEIGHT] | [REPS] | [NOTES] |

### Set 3
| Exercise | Weight | Reps | Notes |
|----------|--------|------|-------|
| [EXERCISE_1_NAME] | [WEIGHT] | [REPS] | [NOTES] |
| [EXERCISE_2_NAME] | [WEIGHT] | [REPS] | [NOTES] |
| [EXERCISE_3_NAME] | [WEIGHT] | [REPS] | [NOTES] |

---

## 📊 Progress Notes
- Date: [DATE]
- Overall Performance: [PERFORMANCE]
- Next Workout: [NEXT_WORKOUT]
`,
};

export default GymWorkoutTemplate; 