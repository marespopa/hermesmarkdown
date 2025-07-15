import DateUtils from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = DateUtils.getDate();
const year = DateUtils.getCurrentYear();

const BookTrackerTemplate: MarkdownTemplate = {
  filename: "book-tracker",
  frontMatter: {
    title: "Book Tracker",
    description: `Track your reading progress, manage your reading list, and discover new books with this comprehensive reading tracker.`,
    tags: "books,reading,library,tracker,goals,education",
  },
  content: `# 📚 Book Tracker
**Created:** ${date}
**Reading Goal:** 12 books this year
**Current Progress:** 3 / 12 books completed

---

## 📖 Currently Reading

| Book Title         | Author      | Genre   | Pages | Progress | Rating | Notes                  |
|--------------------|-------------|---------|-------|----------|--------|------------------------|
| The Great Gatsby   | Jane Doe    | Fiction | 120/180| 67%      | 4/5    | Loving the writing     |

---

## ✅ Completed Books

| Year | Book Title         | Author      | Rating | Date Finished |
|------|--------------------|-------------|--------|---------------|
| ${year} | Atomic Habits      | James Clear | ⭐⭐⭐⭐⭐ | ${date}       |
| ${year} | Deep Work          | Cal Newport | ⭐⭐⭐⭐  | ${date}       |
| 2023 | Sapiens            | Yuval Noah  | ⭐⭐⭐⭐  | ${date}       |
| 2023 | Educated           | Tara Westover| ⭐⭐⭐⭐⭐ | ${date}       |

---

## 📋 Reading List

| Book Title         | Author      | Genre      | Status      | Notes      |
|--------------------|-------------|------------|-------------|------------|
| 1984               | George Orwell| Dystopian  | Next        |            |
| The Lean Startup   | Eric Ries   | Business   | Wishlist    | $15        |
| The Alchemist      | Paulo Coelho| Fiction    | Recommended | John Smith |

---

## 🎯 Reading Goals

| Goal Type      | Target | Current | Status |
|----------------|--------|---------|--------|
| Total Books    | 12     | 3       | [ ]    |
| Non-fiction    | 6      | 2       | [ ]    |
| Fiction        | 6      | 1       | [ ]    |

---

## 📊 Reading Stats

| Genre           | Books Completed |
|-----------------|----------------|
| Fiction         | 1              |
| Non-fiction     | 2              |
| Sci-fi/Fantasy  | 0              |
| Business        | 0              |

| Month     | Books Completed |
|-----------|----------------|
| January   | 1              |
| February  | 2              |
| March     | 0              |

---

## ⭐ Top Rated Books

| Book Title         | Author      | Rating | Date Finished |
|--------------------|-------------|--------|---------------|
| Atomic Habits      | James Clear | ⭐⭐⭐⭐⭐ | ${date}       |
| Educated           | Tara Westover| ⭐⭐⭐⭐⭐ | ${date}       |

---

## 📝 Reading Notes

### Favorite Quotes
- "Habits are the compound interest of self-improvement." - James Clear, Atomic Habits
- "You can only fight the way you practice." - Miyamoto Musashi, The Book of Five Rings

### Key Insights
- **From Deep Work:** Focus is a skill that can be trained.
- **From Sapiens:** Shared myths are the foundation of society.

### Action Items from Books
- [ ] Try the 2-minute rule
- [ ] Schedule daily deep work

---

## 🏆 Reading Challenges

| Challenge                  | Target | Progress | Status |
|----------------------------|--------|----------|--------|
| 12 Books in 12 Months      | 12     | 3/12     | [ ]    |
| Read 1 Classic             | 1      | 0        | [ ]    |
| Read 1 Biography           | 1      | 1        | [x]    |
| 1 Book in Each Genre       | 4      | 2/4      | [ ]    |
| Books from 10 Countries    | 10     | 3/10     | [ ]    |

---

## 📚 Book Clubs

| Club Name      | Current Book      | Meeting Date |
|----------------|------------------|--------------|
| City Readers   | 1984             | ${date}      |

| Book Title         | Club Name      | Date Discussed |
|--------------------|---------------|---------------|
| Sapiens            | City Readers  | ${date}       |

---

## 🎁 Gift Ideas

| Book Title         | Author      | For/From      | Price/Notes |
|--------------------|-------------|--------------|-------------|
| The Alchemist      | Paulo Coelho| For Alice     |             |
| Deep Work          | Cal Newport | For Bob       |             |
| Atomic Habits      | James Clear | From Carol    |             |

---

## 📱 Reading Apps & Tools

| App/Resource   | Details         |
|----------------|----------------|
| Goodreads      | johndoe         |
| Library Card   | City Library    |
| E-reader       | Kindle Paperwhite|
| Book Blogs     | BookBlog        |
| Book Podcasts  | BookCast        |

---

## 🎯 Future Reading Plans

| Book Title         | Author      | Status      |
|--------------------|-------------|-------------|
| The Power of Habit | Charles Duhigg| Next      |
| War and Peace      | Leo Tolstoy | Bucket List|

---

## 📝 Reading Notes

### Favorite Quotes
- "Habits are the compound interest of self-improvement." - James Clear, Atomic Habits
- "You can only fight the way you practice." - Miyamoto Musashi, The Book of Five Rings

### Key Insights
- **From Deep Work:** Focus is a skill that can be trained.
- **From Sapiens:** Shared myths are the foundation of society.

### Action Items from Books
- [ ] Try the 2-minute rule
- [ ] Schedule daily deep work
`,
};

export default BookTrackerTemplate; 