import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const RecipeTemplate: MarkdownTemplate = {
  filename: "recipe",
  frontMatter: {
    title: "Recipe",
    description: `A comprehensive template for documenting recipes with ingredients, instructions, and cooking tips.`,
    tags: "recipe,cooking,food,kitchen,meal",
  },
  content: `# 👨‍🍳 Recipe

**Recipe Name:** [Recipe Title]
**Category:** [Breakfast/Lunch/Dinner/Dessert/Snack]
**Cuisine:** [Italian/Mexican/Asian/American/etc.]
**Difficulty:** [Easy/Medium/Hard]
**Created:** ${date}
**Source:** [Original source or inspiration]

---

## 📊 Recipe Information
- **Prep Time:** [X minutes]
- **Cook Time:** [X minutes]
- **Total Time:** [X minutes]
- **Servings:** [X servings]
- **Calories per serving:** [X calories]

---

## 🥘 Ingredients

### Main Ingredients
- [ ] [Amount] [Ingredient 1]
- [ ] [Amount] [Ingredient 2]
- [ ] [Amount] [Ingredient 3]
- [ ] [Amount] [Ingredient 4]
- [ ] [Amount] [Ingredient 5]

### Seasonings & Spices
- [ ] [Amount] [Spice 1]
- [ ] [Amount] [Spice 2]
- [ ] [Amount] [Spice 3]

### Optional Additions
- [ ] [Amount] [Optional ingredient 1]
- [ ] [Amount] [Optional ingredient 2]

---

## 🍳 Instructions

### Step 1: [Preparation Step]
1. [Detailed instruction]
2. [Detailed instruction]
3. [Detailed instruction]

### Step 2: [Cooking Step]
1. [Detailed instruction]
2. [Detailed instruction]
3. [Detailed instruction]

### Step 3: [Final Step]
1. [Detailed instruction]
2. [Detailed instruction]
3. [Detailed instruction]

---

## ⚡ Quick Tips
- **Pro Tip 1:** [Helpful cooking tip]
- **Pro Tip 2:** [Helpful cooking tip]
- **Pro Tip 3:** [Helpful cooking tip]

---

## 🔄 Variations
### Variation 1: [Variation Name]
- **Substitution:** [What to change]
- **Result:** [How it affects the dish]

### Variation 2: [Variation Name]
- **Substitution:** [What to change]
- **Result:** [How it affects the dish]

---

## 🍽️ Serving Suggestions
- [Serving suggestion 1]
- [Serving suggestion 2]
- [Serving suggestion 3]

### Side Dishes
- [ ] [Side dish 1]
- [ ] [Side dish 2]
- [ ] [Side dish 3]

### Beverages
- [ ] [Beverage 1]
- [ ] [Beverage 2]

---

## 📋 Equipment Needed
- [ ] [Equipment 1]
- [ ] [Equipment 2]
- [ ] [Equipment 3]
- [ ] [Equipment 4]

---

## ⏰ Timing Breakdown
- **Prep:** [X minutes] - [What to do]
- **Cook:** [X minutes] - [What to do]
- **Rest:** [X minutes] - [What to do]
- **Total:** [X minutes]

---

## 🌡️ Temperature & Settings
- **Oven Temperature:** [X°F/X°C]
- **Stovetop Setting:** [Low/Medium/High]
- **Cooking Method:** [Bake/Sauté/Boil/Grill/etc.]

---

## 📏 Measurements & Conversions
| Metric | Imperial |
|--------|----------|
| [X grams] | [X ounces] |
| [X milliliters] | [X cups] |
| [X centimeters] | [X inches] |

---

## 🥄 Technique Notes
- **Technique 1:** [Explanation of cooking technique]
- **Technique 2:** [Explanation of cooking technique]
- **Technique 3:** [Explanation of cooking technique]

---

## 🚨 Common Mistakes to Avoid
- [ ] [Mistake 1] - [Why it happens and how to avoid it]
- [ ] [Mistake 2] - [Why it happens and how to avoid it]
- [ ] [Mistake 3] - [Why it happens and how to avoid it]

---

## ❓ Troubleshooting
### Problem: [Common problem]
**Solution:** [How to fix it]

### Problem: [Common problem]
**Solution:** [How to fix it]

### Problem: [Common problem]
**Solution:** [How to fix it]

---

## 🥗 Nutritional Information
**Per Serving:**
- **Calories:** [X calories]
- **Protein:** [X grams]
- **Carbohydrates:** [X grams]
- **Fat:** [X grams]
- **Fiber:** [X grams]
- **Sugar:** [X grams]
- **Sodium:** [X milligrams]

---

## 🏷️ Dietary Information
- [ ] **Vegetarian:** [Yes/No]
- [ ] **Vegan:** [Yes/No]
- [ ] **Gluten-Free:** [Yes/No]
- [ ] **Dairy-Free:** [Yes/No]
- [ ] **Nut-Free:** [Yes/No]

---

## 🍷 Wine Pairing
- **Red Wine:** [Wine recommendation]
- **White Wine:** [Wine recommendation]
- **Beer:** [Beer recommendation]

---

## 📸 Presentation Tips
- [Presentation tip 1]
- [Presentation tip 2]
- [Presentation tip 3]

---

## 💡 Storage & Leftovers
- **Refrigerator:** [How long it keeps]
- **Freezer:** [How long it keeps]
- **Reheating:** [Best method to reheat]

---

## 📝 Notes & Modifications
- [Note 1]
- [Note 2]
- [Note 3]

---

## ⭐ Rating & Reviews
**My Rating:** [X/5 stars]
**Family Rating:** [X/5 stars]
**Guest Rating:** [X/5 stars]

### Reviews
- **Date:** [Date] - **Rating:** [X/5] - **Comments:** [Review]
- **Date:** [Date] - **Rating:** [X/5] - **Comments:** [Review]

---

## 🔗 Related Recipes
- [Related recipe 1]
- [Related recipe 2]
- [Related recipe 3]

---

## 🏷️ Tags
#recipe #cooking #[cuisine] #[meal-type] #[difficulty] #[date]
`,
};

export default RecipeTemplate; 