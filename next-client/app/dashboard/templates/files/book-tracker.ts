import { getDate } from "@/app/services/date-utils";
import { MarkdownTemplate } from "..";

const date = getDate();

const BookTrackerTemplate: MarkdownTemplate = {
  filename: "book-tracker",
  frontMatter: {
    title: "Book Tracker",
    description: `Track your reading progress, manage your reading list, and discover new books with this comprehensive reading tracker.`,
    tags: "books,reading,library,tracker,goals,education",
  },
  content: `# 📚 Book Tracker

**Created:** ${date}

**Reading Goal:** [X] books this year

**Current Progress:** [X] / [Goal] books completed

---

## 📖 Currently Reading

### [Book Title] by [Author]
- **Genre:** [Fiction/Non-fiction/etc.]
- **Pages:** [X] / [Total] pages
- **Progress:** [X]% complete
- **Rating So Far:** [X]/5 stars
- **Notes:** [Thoughts, quotes, insights]

---

## ✅ Completed Books

### 2024
- [ ] **Book Title** by [Author] - ⭐⭐⭐⭐⭐ - [Date finished]
- [ ] **Book Title** by [Author] - ⭐⭐⭐⭐ - [Date finished]
- [ ] **Book Title** by [Author] - ⭐⭐⭐ - [Date finished]

### 2023
- [ ] **Book Title** by [Author] - ⭐⭐⭐⭐ - [Date finished]
- [ ] **Book Title** by [Author] - ⭐⭐⭐⭐⭐ - [Date finished]

---

## 📋 Reading List

### Next 5 Books
1. [ ] **Book Title** by [Author] - [Genre]
2. [ ] **Book Title** by [Author] - [Genre]
3. [ ] **Book Title** by [Author] - [Genre]
4. [ ] **Book Title** by [Author] - [Genre]
5. [ ] **Book Title** by [Author] - [Genre]

### Recommended by Others
- [ ] **Book Title** by [Author] - Recommended by [Person]
- [ ] **Book Title** by [Author] - Recommended by [Person]

### Wishlist
- [ ] **Book Title** by [Author] - [Genre] - $[Price]
- [ ] **Book Title** by [Author] - [Genre] - $[Price]

---

## 🎯 Reading Goals

### 2024 Goals
- [ ] **Total Books:** [X] books (currently [X]/[Goal])
- [ ] **Non-fiction:** [X] books (currently [X]/[Goal])
- [ ] **Fiction:** [X] books (currently [X]/[Goal])

### Monthly Progress
- **January:** [X] books completed
- **February:** [X] books completed
- **March:** [X] books completed

---

## 📊 Reading Stats

### Genre Breakdown
- **Fiction:** [X] books
- **Non-fiction:** [X] books
- **Sci-fi/Fantasy:** [X] books
- **Business:** [X] books

### Reading Speed
- **Average Books/Month:** [X] books
- **Fastest Read:** [Book Title] in [X] days

---

## ⭐ Top Rated Books

### 5-Star Reads
- [ ] **Book Title** by [Author] - [Date finished]
- [ ] **Book Title** by [Author] - [Date finished]

### 4-Star Reads
- [ ] **Book Title** by [Author] - [Date finished]
- [ ] **Book Title** by [Author] - [Date finished]

---

## 📝 Reading Notes

### Favorite Quotes
> "Quote from book 1" - [Author], [Book Title]

> "Quote from book 2" - [Author], [Book Title]

### Key Insights
- **From [Book Title]:** [Key insight or lesson]
- **From [Book Title]:** [Key insight or lesson]

### Action Items from Books
- [ ] [Action from book 1]
- [ ] [Action from book 2]

---

## 🏆 Reading Challenges

### 2024 Reading Challenge
- [ ] **12 Books in 12 Months** - [X]/12 completed
- [ ] **Read 1 Classic** - [ ] Completed
- [ ] **Read 1 Biography** - [ ] Completed

### Personal Challenges
- [ ] **Read 1 Book in Each Genre** - [X]/[Total] completed
- [ ] **Read Books from 10 Different Countries** - [X]/10 completed

---

## 📚 Book Clubs

### Current Book Club
- **Club Name:** [Club Name]
- **Current Book:** [Book Title]
- **Meeting Date:** [Date]

### Past Book Club Reads
- [ ] **Book Title** by [Author] - [Club Name] - [Date discussed]

---

## 🎁 Gift Ideas

### Books to Gift Others
- [ ] **Book Title** by [Author] - For [Person]
- [ ] **Book Title** by [Author] - For [Person]

### Books I'd Like to Receive
- [ ] **Book Title** by [Author]
- [ ] **Book Title** by [Author]

---

## 📱 Reading Apps & Tools

### Apps I Use
- **Goodreads:** [Username]
- **Library Card:** [Library name]
- **E-reader:** [Device type]

### Reading Resources
- **Book Blogs:** [Blog names]
- **Book Podcasts:** [Podcast names]

---

## 🎯 Future Reading Plans

### Next Month's Reading List
1. [ ] **Book Title** by [Author]
2. [ ] **Book Title** by [Author]
3. [ ] **Book Title** by [Author]

### Reading Bucket List
- [ ] **War and Peace** by Leo Tolstoy
- [ ] **Ulysses** by James Joyce
- [ ] **The Divine Comedy** by Dante Alighieri
`,
};

export default BookTrackerTemplate; 