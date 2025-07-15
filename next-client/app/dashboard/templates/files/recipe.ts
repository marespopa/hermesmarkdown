import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();
const month = DateUtils.getCurrentMonth();

const RecipeTemplate: MarkdownTemplate = {
  filename: "recipe",
  frontMatter: {
    title: "Recipe",
    description: `A comprehensive template for documenting recipes with ingredients, instructions, and cooking tips.`,
    tags: "recipe,cooking,food,kitchen,meal",
  },
  content: `# 👨‍🍳 Recipe
**Recipe Name:** Spaghetti Bolognese
**Category:** Dinner
**Cuisine:** Italian
**Difficulty:** Easy
**Created:** ${date}
**Source:** Grandma

---

## 📊 Recipe Information

| Field            | Value        |
|------------------|--------------|
| Prep Time        | 30 minutes   |
| Cook Time        | 45 minutes   |
| Total Time       | 75 minutes   |
| Servings         | 4            |
| Calories/serving | 500          |

---

## 🥘 Ingredients

| Amount | Ingredient        |
|--------|-------------------|
| 400g   | Spaghetti         |
| 250g   | Ground Beef       |
| 1      | Onion             |
| 2      | Garlic Cloves     |
| 400g   | Tomato Sauce      |

### Seasonings & Spices

| Amount | Spice             |
|--------|-------------------|
| 1 tsp  | Salt              |
| 1 tsp  | Pepper            |
| 1 tsp  | Oregano           |

### Optional Additions

| Amount | Optional Ingredient |
|--------|---------------------|
| 50g    | Olives              |
| 50g    | Mushrooms           |

---

## 🍳 Instructions

### Step 1: Prepare Ingredients
1. Chop onion and garlic
2. Boil water for pasta
3. Grate cheese

### Step 2: Cook Sauce
1. Sauté onion and garlic
2. Add ground beef and cook
3. Pour in tomato sauce and simmer

### Step 3: Combine & Serve
1. Cook spaghetti
2. Mix with sauce
3. Serve with cheese

---

## ⚡ Quick Tips

- **Pro Tip 1:** Use fresh herbs
- **Pro Tip 2:** Simmer sauce for extra flavor
- **Pro Tip 3:** Save some pasta water

---

## 🔄 Variations

### Variation 1: Vegetarian
- **Substitution:** Use lentils instead of beef
- **Result:** Higher fiber, plant-based

### Variation 2: Spicy
- **Substitution:** Add chili flakes
- **Result:** More heat

---

## 🍽️ Serving Suggestions

- Serve with garlic bread
- Add a side salad
- Pair with red wine

### Side Dishes

| Side Dish        |
|------------------|
| Garlic Bread     |
| Caesar Salad     |
| Roasted Veggies  |

### Beverages

| Beverage         |
|------------------|
| Red Wine         |
| Sparkling Water  |

---

## 📋 Equipment Needed

| Equipment        |
|------------------|
| Saucepan         |
| Frying Pan       |
| Wooden Spoon     |
| Colander         |

---

## ⏰ Timing Breakdown

| Stage   | Time    | What to do         |
|---------|---------|--------------------|
| Prep    | 15 min  | Chop & measure     |
| Cook    | 45 min  | Sauté & simmer     |
| Rest    | 5 min   | Let cool           |
| Total   | 75 min  |                    |

---

## 🌡️ Temperature & Settings

- **Oven Temperature:** 180°C
- **Stovetop Setting:** Medium
- **Cooking Method:** Sauté

---

## 📏 Measurements & Conversions

- 100g = 3.5oz
- 250ml = 1 cup
- 10cm = 4in

---

## 🥄 Technique Notes

- **Technique 1:** Sauté onions until translucent
- **Technique 2:** Deglaze pan with wine
- **Technique 3:** Simmer sauce slowly

---

## 🚨 Common Mistakes to Avoid

- [ ] Overcooking pasta - Taste test for doneness
- [ ] Burning garlic - Sauté on low heat
- [ ] Overseasoning - Add salt gradually

---

## ❓ Troubleshooting

### Problem: Sauce too thick
**Solution:** Add a splash of pasta water

### Problem: Pasta sticks together
**Solution:** Stir occasionally and add oil

### Problem: Sauce bland
**Solution:** Add more herbs and salt

---

## 🥗 Nutritional Information

| Nutrient      | Value   |
|--------------|---------|
| Calories      | 500     |
| Protein       | 20g     |
| Carbohydrates | 60g     |
| Fat           | 15g     |
| Fiber         | 5g      |
| Sugar         | 8g      |
| Sodium        | 600mg   |

---

## 🏷️ Dietary Information

| Dietary Option | Yes/No |
|----------------|--------|
| Vegetarian     | No     |
| Vegan          | No     |
| Gluten-Free    | No     |
| Dairy-Free     | No     |
| Nut-Free       | Yes    |

---

## 🍷 Wine Pairing

- **Red Wine:** Chianti
- **White Wine:** Pinot Grigio
- **Beer:** Lager

---

## 📸 Presentation Tips

- Garnish with basil
- Serve in a wide bowl
- Sprinkle cheese on top

---

## 💡 Storage & Leftovers

- **Refrigerator:** 3 days
- **Freezer:** 1 month
- **Reheating:** Microwave or stovetop

---

## 📝 Notes & Modifications

- Used whole wheat pasta
- Added extra garlic
- Reduced salt

---

## ⭐ Rating & Reviews

| Reviewer      | Date       | Rating | Comments      |
|--------------|------------|--------|--------------|
| Me           | ${date}    | 5/5    | Delicious!    |
| Family       | ${date}    | 4/5    | Tasty, less salt next time |
| Guest        | ${date}    | 5/5    | Loved it      |

---

## 🔗 Related Recipes

- Penne Arrabbiata
- Lasagna
- Pesto Pasta

---

## 🏷️ Tags

#recipe #cooking #italian #dinner #easy #${month}-${date}`,
};

export default RecipeTemplate; 